import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => {
  const tx = {
    sessionRegistration: {
      findFirst: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    gameSession: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    joinToken: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  };

  return {
    tx,
    prisma: {
      $transaction: vi.fn(),
      sessionRegistration: {
        findFirst: vi.fn(),
        count: vi.fn(),
      },
      joinToken: {
        create: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
    },
  };
});

const presenceMocks = vi.hoisted(() => ({
  markLobbyPresence: vi.fn(),
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
    WAITING_START: "WAITING_START",
    LIVE: "LIVE",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED",
  },
  SessionRegistrationStatus: {
    CREATED: "CREATED",
    PAYMENT_PENDING: "PAYMENT_PENDING",
    PAID: "PAID",
    CHECKED_IN: "CHECKED_IN",
    IN_ROOM: "IN_ROOM",
    NO_SHOW: "NO_SHOW",
    CANCELLED: "CANCELLED",
    REFUNDED: "REFUNDED",
    EXPIRED: "EXPIRED",
  },
}));

vi.mock("../presence.js", () => presenceMocks);

vi.mock("../../queues/registrationExpiration.js", () => ({
  scheduleRegistrationExpiration: vi.fn(),
}));

import { checkInDeadlineFor, checkInPlayer, consumeJoinToken, issueJoinToken } from "../lobby.js";

function registration(overrides: Record<string, unknown> = {}) {
  const now = new Date("2026-07-08T00:00:00Z");
  return {
    id: "registration-1",
    userId: "player-1",
    sessionId: "session-1",
    status: "PAID",
    paymentDeadlineAt: null,
    paidAt: now,
    checkedInAt: null,
    inRoomAt: null,
    noShowAt: null,
    cancelledAt: null,
    cancellationReason: null,
    createdAt: now,
    updatedAt: now,
    session: {
      id: "session-1",
      status: "ACTIVE",
      startTime: new Date("2026-07-08T00:10:00Z"),
      cancelledAt: null,
    },
    ...overrides,
  };
}

function joinToken(overrides: Record<string, unknown> = {}) {
  return {
    id: "join-token-1",
    tokenHash: "hash",
    userId: "player-1",
    sessionId: "session-1",
    registrationId: "registration-1",
    expiresAt: new Date("2026-07-08T00:02:00Z"),
    consumedAt: null,
    createdAt: new Date("2026-07-08T00:00:00Z"),
    ...overrides,
  };
}

describe("lobby business logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof dbMocks.tx) => unknown) => callback(dbMocks.tx),
    );
    dbMocks.tx.sessionRegistration.findFirst.mockResolvedValue(registration());
    dbMocks.tx.sessionRegistration.update.mockResolvedValue(
      registration({
        status: "CHECKED_IN",
        checkedInAt: new Date("2026-07-08T00:00:00Z"),
      }),
    );
    dbMocks.tx.sessionRegistration.updateMany.mockResolvedValue({ count: 1 });
    dbMocks.tx.auditLog.create.mockResolvedValue({});
    dbMocks.tx.joinToken.findUnique.mockResolvedValue(joinToken());
    dbMocks.tx.joinToken.update.mockResolvedValue(
      joinToken({ consumedAt: new Date("2026-07-08T00:01:00Z") }),
    );
    dbMocks.prisma.sessionRegistration.findFirst.mockResolvedValue(
      registration({
        status: "CHECKED_IN",
        session: { id: "session-1", status: "LIVE" },
      }),
    );
    dbMocks.prisma.sessionRegistration.count.mockResolvedValue(1);
    dbMocks.prisma.joinToken.create.mockResolvedValue(joinToken());
    dbMocks.prisma.auditLog.create.mockResolvedValue({});
    presenceMocks.markLobbyPresence.mockResolvedValue({
      available: true,
      count: 1,
      ttlSeconds: 60,
    });
  });

  it("computes check-in deadline from session start time plus grace period", () => {
    expect(checkInDeadlineFor({ startTime: new Date("2026-07-08T00:10:00Z") })?.toISOString()).toBe(
      "2026-07-08T00:15:00.000Z",
    );
  });

  it("checks in a paid registration", async () => {
    const result = await checkInPlayer({
      userId: "player-1",
      sessionId: "session-1",
      now: new Date("2026-07-08T00:00:00Z"),
    });

    expect(result.type).toBe("ok");
    expect(dbMocks.tx.sessionRegistration.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "CHECKED_IN", checkedInAt: expect.any(Date) }),
      }),
    );
  });

  it("makes repeated check-in idempotent", async () => {
    dbMocks.tx.sessionRegistration.findFirst.mockResolvedValue(
      registration({ status: "CHECKED_IN", checkedInAt: new Date("2026-07-08T00:00:00Z") }),
    );

    const result = await checkInPlayer({
      userId: "player-1",
      sessionId: "session-1",
      now: new Date("2026-07-08T00:01:00Z"),
    });

    expect(result.type).toBe("idempotent");
    expect(dbMocks.tx.sessionRegistration.update).not.toHaveBeenCalled();
  });

  it("refuses check-in after deadline", async () => {
    const result = await checkInPlayer({
      userId: "player-1",
      sessionId: "session-1",
      now: new Date("2026-07-08T00:15:00Z"),
    });

    expect(result.type).toBe("checkin-closed");
    expect(dbMocks.tx.sessionRegistration.update).not.toHaveBeenCalled();
  });

  it("issues a short-lived join token for checked-in player", async () => {
    const result = await issueJoinToken({
      userId: "player-1",
      sessionId: "session-1",
      now: new Date("2026-07-08T00:00:00Z"),
    });

    expect(result.type).toBe("ok");
    if (result.type === "ok") {
      expect(result.token).toEqual(expect.any(String));
    }
    expect(dbMocks.prisma.joinToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "player-1",
          sessionId: "session-1",
          registrationId: "registration-1",
          expiresAt: new Date("2026-07-08T00:02:00Z"),
        }),
      }),
    );
  });

  it("refuses join token before the session is live", async () => {
    dbMocks.prisma.sessionRegistration.findFirst.mockResolvedValue(
      registration({
        status: "CHECKED_IN",
        session: { id: "session-1", status: "ACTIVE" },
      }),
    );

    const result = await issueJoinToken({
      userId: "player-1",
      sessionId: "session-1",
      now: new Date("2026-07-08T00:00:00Z"),
    });

    expect(result.type).toBe("session-not-live");
    expect(dbMocks.prisma.joinToken.create).not.toHaveBeenCalled();
  });

  it("issues a join token for a player already in room", async () => {
    dbMocks.prisma.sessionRegistration.findFirst.mockResolvedValue(
      registration({
        status: "IN_ROOM",
        session: { id: "session-1", status: "LIVE" },
      }),
    );

    const result = await issueJoinToken({
      userId: "player-1",
      sessionId: "session-1",
      now: new Date("2026-07-08T00:00:00Z"),
    });

    expect(result.type).toBe("ok");
  });

  it("consumes a join token once", async () => {
    const result = await consumeJoinToken({
      token: "token-value",
      now: new Date("2026-07-08T00:01:00Z"),
    });

    expect(result.type).toBe("ok");
    expect(dbMocks.tx.joinToken.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { consumedAt: expect.any(Date) } }),
    );
    expect(dbMocks.tx.sessionRegistration.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "IN_ROOM", inRoomAt: expect.any(Date) }),
      }),
    );
  });

  it("rejects expired and reused join tokens", async () => {
    const expired = await consumeJoinToken({
      token: "token-value",
      now: new Date("2026-07-08T00:03:00Z"),
    });
    expect(expired.type).toBe("expired");

    dbMocks.tx.joinToken.findUnique.mockResolvedValue(
      joinToken({ consumedAt: new Date("2026-07-08T00:01:00Z") }),
    );
    const reused = await consumeJoinToken({
      token: "token-value",
      now: new Date("2026-07-08T00:01:30Z"),
    });
    expect(reused.type).toBe("used");
  });
});
