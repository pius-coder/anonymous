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
      update: vi.fn(),
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
      sessionRegistration: {
        findFirst: vi.fn(),
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
  SessionRegistrationStatus: {
    CREATED: "CREATED",
    PAYMENT_PENDING: "PAYMENT_PENDING",
    PAID: "PAID",
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
    dbMocks.prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof dbMocks.tx) => unknown) => callback(dbMocks.tx),
    );
    dbMocks.tx.gameSession.findUnique.mockResolvedValue(activeSession());
    dbMocks.tx.sessionRegistration.findFirst.mockResolvedValue(null);
    dbMocks.tx.sessionRegistration.count.mockResolvedValue(0);
    dbMocks.tx.sessionRegistration.create.mockResolvedValue(registration());
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

  it("cancels own pending registration", async () => {
    dbMocks.tx.sessionRegistration.findUnique.mockResolvedValue(registration());
    dbMocks.tx.sessionRegistration.update.mockResolvedValue(
      registration({
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancellationReason: "changed mind",
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

    expect(res.status).toBe(200);
    expect(dbMocks.tx.sessionRegistration.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "CANCELLED", cancellationReason: "changed mind" }),
      }),
    );
  });

  it("prevents cancelling another player's registration", async () => {
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
    expect(dbMocks.tx.sessionRegistration.update).not.toHaveBeenCalled();
  });

  it("prevents direct cancellation after payment", async () => {
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
