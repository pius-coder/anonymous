import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

const dbMocks = vi.hoisted(() => {
  const tx = {
    gameSession: {
      findUnique: vi.fn(),
    },
    sessionRegistration: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    paymentTransaction: {
      updateMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  };

  return {
    tx,
    prisma: {
      authSession: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      gameSession: {
        findFirst: vi.fn(),
      },
      sessionRegistration: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
      },
      $transaction: vi.fn(),
    },
  };
});

const queueMocks = vi.hoisted(() => ({
  scheduleRegistrationExpiration: vi.fn(),
}));

vi.mock("@session-jeu/db", () => ({
  prisma: dbMocks.prisma,
  Prisma: {
    TransactionIsolationLevel: { Serializable: "Serializable" },
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code: string;

      constructor(code: string) {
        super(code);
        this.code = code;
      }
    },
  },
  GameSessionStatus: {
    DRAFT: "DRAFT",
    PUBLISHED: "PUBLISHED",
    ACTIVE: "ACTIVE",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED",
  },
  SessionVisibility: { PUBLIC: "PUBLIC", UNLISTED: "UNLISTED", PRIVATE: "PRIVATE" },
  PaymentStatus: {
    PENDING: "PENDING",
    EXPIRED: "EXPIRED",
    SUCCESSFUL: "SUCCESSFUL",
    FAILED: "FAILED",
    REFUNDED: "REFUNDED",
  },
  SessionRegistrationStatus: {
    CREATED: "CREATED",
    PAYMENT_PENDING: "PAYMENT_PENDING",
    PAID: "PAID",
    CHECKED_IN: "CHECKED_IN",
    IN_ROOM: "IN_ROOM",
    CANCELLED: "CANCELLED",
    REFUNDED: "REFUNDED",
    EXPIRED: "EXPIRED",
  },
}));

vi.mock("../../queues/registrationExpiration.js", () => queueMocks);

import { SESSION_COOKIE_NAME, hashOpaqueToken } from "../../auth/session.js";
import type { AuthVariables } from "../../auth/session.js";
import registrations from "../registrations.js";

function createApp() {
  const app = new Hono<{ Variables: AuthVariables }>();
  app.route("/v1", registrations);
  return app;
}

function validAuthSession(userId = "player-1") {
  return {
    id: "auth-session-1",
    tokenHash: hashOpaqueToken("session-token"),
    sessionVersion: 1,
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    user: {
      id: userId,
      email: `${userId}@example.com`,
      name: "Player",
      role: "PLAYER",
      isActive: true,
      sessionVersion: 1,
    },
  };
}

function activeSession(overrides: Record<string, unknown> = {}) {
  return {
    id: "session-1",
    status: "ACTIVE",
    visibility: "PUBLIC",
    maxPlayers: 2,
    registrationClosesAt: new Date(Date.now() + 60_000),
    ...overrides,
  };
}

function registration(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  return {
    id: "registration-1",
    userId: "player-1",
    sessionId: "session-1",
    status: "PAYMENT_PENDING",
    paymentDeadlineAt: new Date(now.getTime() + 15 * 60_000),
    paidAt: null,
    cancelledAt: null,
    cancellationReason: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("registration routes", () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.prisma.authSession.findUnique.mockResolvedValue(validAuthSession());
    dbMocks.prisma.gameSession.findFirst.mockResolvedValue({
      id: "session-1",
      code: "SESSION-1",
    });
    dbMocks.prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof dbMocks.tx) => unknown) => callback(dbMocks.tx),
    );
    dbMocks.tx.gameSession.findUnique.mockResolvedValue(activeSession());
    dbMocks.tx.sessionRegistration.findFirst.mockResolvedValue(null);
    dbMocks.tx.sessionRegistration.count.mockResolvedValue(0);
    dbMocks.tx.sessionRegistration.create.mockResolvedValue(registration());
    dbMocks.prisma.sessionRegistration.findUnique.mockResolvedValue(registration());
    dbMocks.tx.sessionRegistration.updateMany.mockResolvedValue({ count: 1 });
    dbMocks.tx.sessionRegistration.findUniqueOrThrow.mockResolvedValue(
      registration({
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancellationReason: "changed mind",
      }),
    );
    dbMocks.tx.auditLog.create.mockResolvedValue({});
    queueMocks.scheduleRegistrationExpiration.mockResolvedValue(undefined);
  });

  it("creates a payment pending registration and schedules expiration", async () => {
    const res = await app.request("/v1/sessions/session-1/register", {
      method: "POST",
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` },
    });

    expect(res.status).toBe(201);
    expect(dbMocks.tx.sessionRegistration.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "player-1",
          sessionId: "session-1",
          status: "PAYMENT_PENDING",
          paymentDeadlineAt: expect.any(Date),
        }),
      }),
    );
    expect(queueMocks.scheduleRegistrationExpiration).toHaveBeenCalledWith(
      expect.objectContaining({ registrationId: "registration-1" }),
    );
    expect(dbMocks.tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "registration.created" }),
      }),
    );
  });

  it("refuses duplicate active registration", async () => {
    dbMocks.tx.sessionRegistration.findFirst.mockResolvedValue(registration());

    const res = await app.request("/v1/sessions/session-1/register", {
      method: "POST",
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` },
    });

    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("ALREADY_REGISTERED");
    expect(dbMocks.tx.sessionRegistration.create).not.toHaveBeenCalled();
  });

  it("refuses full sessions", async () => {
    dbMocks.tx.sessionRegistration.count.mockResolvedValue(2);

    const res = await app.request("/v1/sessions/session-1/register", {
      method: "POST",
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` },
    });

    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("SESSION_FULL");
  });

  it("refuses closed registration", async () => {
    dbMocks.tx.gameSession.findUnique.mockResolvedValue(activeSession({ status: "PUBLISHED" }));

    const res = await app.request("/v1/sessions/session-1/register", {
      method: "POST",
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` },
    });

    expect(res.status).toBe(423);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("REGISTRATION_CLOSED");
  });

  it("does not allow direct registration for PRIVATE sessions", async () => {
    dbMocks.tx.gameSession.findUnique.mockResolvedValue(activeSession({ visibility: "PRIVATE" }));

    const res = await app.request("/v1/sessions/session-1/register", {
      method: "POST",
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` },
    });

    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("SESSION_NOT_FOUND");
    expect(dbMocks.tx.sessionRegistration.create).not.toHaveBeenCalled();
  });

  it("returns current player registration", async () => {
    dbMocks.prisma.sessionRegistration.findFirst.mockResolvedValue(registration());

    const res = await app.request("/v1/sessions/session-1/registration", {
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` },
    });

    expect(res.status).toBe(200);
    expect(dbMocks.prisma.sessionRegistration.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ sessionId: "session-1", userId: "player-1" }),
      }),
    );
  });

  it("resolves public session code before reading current registration", async () => {
    dbMocks.prisma.sessionRegistration.findFirst.mockResolvedValue(registration());

    const res = await app.request("/v1/sessions/SESSION-1/registration", {
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` },
    });

    expect(res.status).toBe(200);
    expect(dbMocks.prisma.gameSession.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: [{ id: "SESSION-1" }, { code: "SESSION-1" }] },
      }),
    );
  });

  it("cancels own pending registration", async () => {
    dbMocks.tx.sessionRegistration.findUnique.mockResolvedValue(registration());

    const res = await app.request("/v1/registrations/registration-1/cancel", {
      method: "POST",
      body: JSON.stringify({ reason: "changed mind" }),
      headers: {
        "content-type": "application/json",
        cookie: `${SESSION_COOKIE_NAME}=session-token`,
      },
    });

    expect(res.status).toBe(200);
    expect(dbMocks.tx.sessionRegistration.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "CANCELLED", cancellationReason: "changed mind" }),
      }),
    );
  });

  it("does not cancel while a Fapshi checkout is still being created", async () => {
    dbMocks.prisma.sessionRegistration.findUnique.mockResolvedValue(
      registration({
        payment: {
          id: "payment-1",
          provider: "FAPSHI",
          status: "PENDING",
          providerTransId: null,
        },
      }),
    );

    const res = await app.request("/v1/registrations/registration-1/cancel", {
      method: "POST",
      body: JSON.stringify({ reason: "changed mind" }),
      headers: {
        "content-type": "application/json",
        cookie: `${SESSION_COOKIE_NAME}=session-token`,
      },
    });

    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("PAYMENT_CANCELLATION_PENDING");
    expect(dbMocks.tx.sessionRegistration.updateMany).not.toHaveBeenCalled();
  });

  it("prevents cancelling another player's registration", async () => {
    dbMocks.prisma.sessionRegistration.findUnique.mockResolvedValue(
      registration({ userId: "other-player" }),
    );
    dbMocks.tx.sessionRegistration.findUnique.mockResolvedValue(
      registration({ userId: "other-player" }),
    );

    const res = await app.request("/v1/registrations/registration-1/cancel", {
      method: "POST",
      body: JSON.stringify({ reason: "changed mind" }),
      headers: {
        "content-type": "application/json",
        cookie: `${SESSION_COOKIE_NAME}=session-token`,
      },
    });

    expect(res.status).toBe(403);
    expect(dbMocks.tx.sessionRegistration.updateMany).not.toHaveBeenCalled();
  });

  it("prevents direct cancellation after payment", async () => {
    dbMocks.prisma.sessionRegistration.findUnique.mockResolvedValue(
      registration({ status: "PAID", paidAt: new Date() }),
    );
    dbMocks.tx.sessionRegistration.findUnique.mockResolvedValue(
      registration({ status: "PAID", paidAt: new Date() }),
    );

    const res = await app.request("/v1/registrations/registration-1/cancel", {
      method: "POST",
      body: JSON.stringify({ reason: "changed mind" }),
      headers: {
        "content-type": "application/json",
        cookie: `${SESSION_COOKIE_NAME}=session-token`,
      },
    });

    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("REGISTRATION_ALREADY_PAID");
  });
});
