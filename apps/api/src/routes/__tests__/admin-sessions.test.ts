import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

const dbMocks = vi.hoisted(() => {
  const tx = {
    gameSession: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      updateMany: vi.fn(),
    },
    sessionRegistration: {
      count: vi.fn(),
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
        findUnique: vi.fn(),
      },
      sessionRegistration: {
        count: vi.fn(),
      },
      $transaction: vi.fn(),
    },
  };
});

const queueMocks = vi.hoisted(() => ({
  scheduleCheckInDeadline: vi.fn(),
}));

vi.mock("@session-jeu/db", () => ({
  prisma: dbMocks.prisma,
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

vi.mock("../../queues/checkInDeadline.js", () => queueMocks);

import { SESSION_COOKIE_NAME, hashOpaqueToken } from "../../auth/session.js";
import type { AuthVariables } from "../../auth/session.js";
import adminSessions from "../admin/sessions.js";

function createApp() {
  const app = new Hono<{ Variables: AuthVariables }>();
  app.route("/v1/admin/sessions", adminSessions);
  return app;
}

function validAuthSession(role: "PLAYER" | "ADMIN" | "SUPER_ADMIN" = "ADMIN") {
  return {
    id: "auth-session-1",
    tokenHash: hashOpaqueToken("session-token"),
    sessionVersion: 1,
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    user: {
      id: "admin-1",
      email: "admin@example.com",
      name: "Admin",
      role,
      isActive: true,
      sessionVersion: 1,
    },
  };
}

function futureDate(minutes = 60) {
  return new Date(Date.now() + minutes * 60_000);
}

function session(overrides: Partial<ReturnType<typeof baseSession>> = {}) {
  return { ...baseSession(), ...overrides };
}

function baseSession() {
  const startsAt = futureDate();
  return {
    id: "session-1",
    code: "NIGHT-DROP-001",
    name: "Night Drop",
    description: "Session admin",
    status: "DRAFT",
    minPlayers: 10,
    maxPlayers: 20,
    entryFee: 1000,
    entryFeeXaf: 1000,
    visibility: "PUBLIC",
    prizePool: 11640,
    prizePoolBps: 6000,
    winnerSplitBps: [10000],
    providerFeeBps: 300,
    configVersion: 1,
    startTime: startsAt,
    endTime: null,
    registrationClosesAt: futureDate(30),
    publishedAt: null,
    cancelledAt: null,
    cancellationReason: null,
    createdBy: "admin-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("admin session routes", () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.prisma.authSession.findUnique.mockResolvedValue(validAuthSession());
    dbMocks.prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof dbMocks.tx) => unknown) => callback(dbMocks.tx),
    );
    dbMocks.tx.auditLog.create.mockResolvedValue({});
    dbMocks.tx.sessionRegistration.count.mockResolvedValue(0);
  });

  it("allows admins to create DRAFT sessions and writes audit", async () => {
    const created = session({ id: "created-session", configVersion: 1 });
    dbMocks.tx.gameSession.create.mockResolvedValue(created);

    const res = await app.request("/v1/admin/sessions", {
      method: "POST",
      body: JSON.stringify({
        name: "Night Drop",
        minPlayers: 10,
        maxPlayers: 20,
        entryFeeXaf: 1000,
        visibility: "PUBLIC",
        startsAt: futureDate().toISOString(),
        registrationClosesAt: futureDate(30).toISOString(),
        reason: "initial configuration",
      }),
      headers: {
        "content-type": "application/json",
        cookie: `${SESSION_COOKIE_NAME}=session-token`,
      },
    });

    expect(res.status).toBe(201);
    expect(dbMocks.tx.gameSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "DRAFT",
          minPlayers: 10,
          maxPlayers: 20,
          entryFeeXaf: 1000,
          entryFee: 1000,
          prizePoolBps: 6000,
          winnerSplitBps: [10000],
          createdBy: "admin-1",
        }),
      }),
    );
    expect(dbMocks.tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "session.draft-created",
          reason: "initial configuration",
        }),
      }),
    );
  });

  it("refuses player access to admin sessions", async () => {
    dbMocks.prisma.authSession.findUnique.mockResolvedValue(validAuthSession("PLAYER"));

    const res = await app.request("/v1/admin/sessions", {
      method: "POST",
      body: JSON.stringify({
        name: "Night Drop",
        minPlayers: 10,
        maxPlayers: 20,
        entryFeeXaf: 1000,
      }),
      headers: {
        "content-type": "application/json",
        cookie: `${SESSION_COOKIE_NAME}=session-token`,
      },
    });

    expect(res.status).toBe(403);
  });

  it("returns financial simulation using paid registrations", async () => {
    dbMocks.prisma.gameSession.findUnique.mockResolvedValue(session());
    dbMocks.prisma.sessionRegistration.count.mockResolvedValue(20);

    const res = await app.request("/v1/admin/sessions/session-1/simulation", {
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { simulation: { grossCollectionXaf: number; organizationCommissionXaf: number } };
    };
    expect(body.data.simulation.grossCollectionXaf).toBe(20_000);
    expect(body.data.simulation.organizationCommissionXaf).toBe(7_760);
    expect(dbMocks.prisma.sessionRegistration.count).toHaveBeenCalledWith({
      where: { sessionId: "session-1", status: "PAID" },
    });
  });

  it("updates config with OCC and audit", async () => {
    const existing = session();
    const updated = session({ name: "Night Drop Updated", configVersion: 2 });
    dbMocks.tx.gameSession.findUnique.mockResolvedValue(existing);
    dbMocks.tx.gameSession.updateMany.mockResolvedValue({ count: 1 });
    dbMocks.tx.gameSession.findUniqueOrThrow.mockResolvedValue(updated);

    const res = await app.request("/v1/admin/sessions/session-1", {
      method: "PATCH",
      body: JSON.stringify({
        expectedConfigVersion: 1,
        name: "Night Drop Updated",
        reason: "copy update",
      }),
      headers: {
        "content-type": "application/json",
        cookie: `${SESSION_COOKIE_NAME}=session-token`,
      },
    });

    expect(res.status).toBe(200);
    expect(dbMocks.tx.gameSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "session-1", configVersion: 1 },
        data: expect.objectContaining({ configVersion: { increment: 1 } }),
      }),
    );
    expect(dbMocks.tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "session.config-updated", reason: "copy update" }),
      }),
    );
  });

  it("returns conflict when configVersion does not match", async () => {
    dbMocks.tx.gameSession.findUnique.mockResolvedValue(session());
    dbMocks.tx.gameSession.updateMany.mockResolvedValue({ count: 0 });

    const res = await app.request("/v1/admin/sessions/session-1", {
      method: "PATCH",
      body: JSON.stringify({
        expectedConfigVersion: 1,
        name: "Night Drop Updated",
        reason: "copy update",
      }),
      headers: {
        "content-type": "application/json",
        cookie: `${SESSION_COOKIE_NAME}=session-token`,
      },
    });

    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("CONFIG_VERSION_CONFLICT");
  });

  it("blocks sensitive config changes when confirmed registrations exist", async () => {
    dbMocks.tx.gameSession.findUnique.mockResolvedValue(session());
    dbMocks.tx.sessionRegistration.count.mockResolvedValue(1);

    const res = await app.request("/v1/admin/sessions/session-1", {
      method: "PATCH",
      body: JSON.stringify({
        expectedConfigVersion: 1,
        entryFeeXaf: 1500,
        reason: "economic update",
      }),
      headers: {
        "content-type": "application/json",
        cookie: `${SESSION_COOKIE_NAME}=session-token`,
      },
    });

    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("PAID_REGISTRATIONS_EXIST");
    expect(dbMocks.tx.gameSession.updateMany).not.toHaveBeenCalled();
  });

  it("publishes valid sessions with audit", async () => {
    const existing = session();
    const updated = session({ status: "PUBLISHED", configVersion: 2, publishedAt: new Date() });
    dbMocks.tx.gameSession.findUnique.mockResolvedValue(existing);
    dbMocks.tx.gameSession.updateMany.mockResolvedValue({ count: 1 });
    dbMocks.tx.gameSession.findUniqueOrThrow.mockResolvedValue(updated);

    const res = await app.request("/v1/admin/sessions/session-1/publish", {
      method: "POST",
      body: JSON.stringify({
        expectedConfigVersion: 1,
        reason: "ready to publish",
      }),
      headers: {
        "content-type": "application/json",
        cookie: `${SESSION_COOKIE_NAME}=session-token`,
      },
    });

    expect(res.status).toBe(200);
    expect(dbMocks.tx.gameSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PUBLISHED", configVersion: { increment: 1 } }),
      }),
    );
    expect(dbMocks.tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "session.published", reason: "ready to publish" }),
      }),
    );
  });

  it("refuses publishing invalid sessions", async () => {
    dbMocks.tx.gameSession.findUnique.mockResolvedValue(session({ startTime: null }));

    const res = await app.request("/v1/admin/sessions/session-1/publish", {
      method: "POST",
      body: JSON.stringify({
        expectedConfigVersion: 1,
        reason: "ready to publish",
      }),
      headers: {
        "content-type": "application/json",
        cookie: `${SESSION_COOKIE_NAME}=session-token`,
      },
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("INVALID_START_TIME");
  });

  it("opens registration for published sessions", async () => {
    const existing = session({ status: "PUBLISHED" });
    const updated = session({ status: "ACTIVE", configVersion: 2 });
    dbMocks.tx.gameSession.findUnique.mockResolvedValue(existing);
    dbMocks.tx.gameSession.updateMany.mockResolvedValue({ count: 1 });
    dbMocks.tx.gameSession.findUniqueOrThrow.mockResolvedValue(updated);

    const res = await app.request("/v1/admin/sessions/session-1/open-registration", {
      method: "POST",
      body: JSON.stringify({
        expectedConfigVersion: 1,
        reason: "open registrations",
      }),
      headers: {
        "content-type": "application/json",
        cookie: `${SESSION_COOKIE_NAME}=session-token`,
      },
    });

    expect(res.status).toBe(200);
    expect(dbMocks.tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "session.registration-opened" }),
      }),
    );
  });

  it("cancels sessions with reason and audit", async () => {
    const existing = session({ status: "PUBLISHED" });
    const updated = session({
      status: "CANCELLED",
      configVersion: 2,
      cancelledAt: new Date(),
      cancellationReason: "event cancelled",
    });
    dbMocks.tx.gameSession.findUnique.mockResolvedValue(existing);
    dbMocks.tx.gameSession.updateMany.mockResolvedValue({ count: 1 });
    dbMocks.tx.gameSession.findUniqueOrThrow.mockResolvedValue(updated);

    const res = await app.request("/v1/admin/sessions/session-1/cancel", {
      method: "POST",
      body: JSON.stringify({
        expectedConfigVersion: 1,
        reason: "event cancelled",
      }),
      headers: {
        "content-type": "application/json",
        cookie: `${SESSION_COOKIE_NAME}=session-token`,
      },
    });

    expect(res.status).toBe(200);
    expect(dbMocks.tx.gameSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "CANCELLED",
          cancellationReason: "event cancelled",
          configVersion: { increment: 1 },
        }),
      }),
    );
    expect(dbMocks.tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "session.cancelled", reason: "event cancelled" }),
      }),
    );
  });
});
