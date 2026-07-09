import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => {
  const tx = {
    liveReservation: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    gameSession: {
      findUnique: vi.fn(),
    },
    playerConnection: {
      upsert: vi.fn(),
      updateMany: vi.fn(),
    },
    liveSessionState: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
    auditLog: {
      createMany: vi.fn(),
      create: vi.fn(),
    },
    roundInstance: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
    roundDeadline: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
    playerAction: {
      findUnique: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    antiCheatEvent: {
      create: vi.fn(),
    },
    riskSignal: {
      create: vi.fn(),
    },
    roundOutcome: {
      findFirst: vi.fn(),
    },
    miniGameDefinition: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
  };

  return {
    tx,
    prisma: {
      $transaction: vi.fn(),
    },
  };
});

const queueMocks = vi.hoisted(() => ({
  scheduleRoundDeadline: vi.fn(),
}));

vi.mock("@session-jeu/db", () => ({
  prisma: dbMocks.prisma,
  GameSessionStatus: { LIVE: "LIVE" },
  LivePhase: {
    BRIEFING: "BRIEFING",
    ROUND_ACTIVE: "ROUND_ACTIVE",
    PAUSED: "PAUSED",
  },
  PlayerConnectionStatus: {
    CONNECTED: "CONNECTED",
    RECONNECTING: "RECONNECTING",
  },
  Prisma: {
    TransactionIsolationLevel: { Serializable: "Serializable" },
  },
  RoundStatus: {
    ACTIVE: "ACTIVE",
  },
  SessionRegistrationStatus: {
    CHECKED_IN: "CHECKED_IN",
    IN_ROOM: "IN_ROOM",
  },
}));

vi.mock("../roundDeadlineQueue.js", () => queueMocks);

import { consumeLiveReservation, startRound, submitPlayerAction } from "../sessionStore.js";

describe("sessionStore live invariants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.prisma.$transaction.mockImplementation(async (callback) => callback(dbMocks.tx));
    dbMocks.tx.roundInstance.upsert.mockResolvedValue({
      id: "round-1",
      sessionId: "session-1",
      roundNum: 1,
      status: "ACTIVE",
    });
    dbMocks.tx.roundDeadline.upsert.mockResolvedValue({
      id: "deadline-1",
      roundId: "round-1",
      deadlineAt: new Date("2026-07-08T00:00:30Z"),
    });
    dbMocks.tx.liveSessionState.upsert.mockResolvedValue({
      id: "live-state-1",
      sessionId: "session-1",
      phase: "ROUND_ACTIVE",
      currentRoundId: "round-1",
    });
    dbMocks.tx.auditLog.createMany.mockResolvedValue({ count: 2 });
    dbMocks.tx.playerAction.count.mockResolvedValue(0);
    dbMocks.tx.antiCheatEvent.create.mockResolvedValue({ id: "anticheat-1" });
    dbMocks.tx.riskSignal.create.mockResolvedValue({ id: "risk-1" });
    dbMocks.tx.roundOutcome.findFirst.mockResolvedValue(null);
    dbMocks.tx.roundInstance.findUnique.mockResolvedValue({ miniGameDefinitionId: null });
    dbMocks.tx.miniGameDefinition.findFirst.mockResolvedValue({
      id: "minigame-1",
      key: "memory-sequence",
      family: "MEMORY",
      name: "Memory Sequence",
      defaultConfig: { sequenceLength: 3 },
    });
    dbMocks.tx.miniGameDefinition.findUnique.mockResolvedValue(null);
  });

  it("starts a round with a durable deadline and BullMQ recovery job", async () => {
    const result = await startRound({
      sessionId: "session-1",
      roundNum: 1,
      durationMs: 30_000,
      now: new Date("2026-07-08T00:00:00Z"),
    });

    expect(result.round.id).toBe("round-1");
    expect(dbMocks.tx.roundDeadline.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ deadlineAt: new Date("2026-07-08T00:00:30Z") }),
      }),
    );
    expect(queueMocks.scheduleRoundDeadline).toHaveBeenCalledWith({
      sessionId: "session-1",
      roundId: "round-1",
      deadlineAt: new Date("2026-07-08T00:00:30Z"),
    });
  });

  it("rejects late actions after official DB deadline", async () => {
    dbMocks.tx.liveSessionState.findUnique.mockResolvedValue({
      currentRoundId: "round-1",
      phase: "ROUND_ACTIVE",
    });
    dbMocks.tx.playerAction.findUnique.mockResolvedValue(null);
    dbMocks.tx.roundDeadline.findUnique.mockResolvedValue({
      roundId: "round-1",
      deadlineAt: new Date("2026-07-08T00:00:30Z"),
      closedAt: null,
    });
    dbMocks.tx.playerAction.create.mockResolvedValue({
      id: "action-1",
      rejectedAt: new Date("2026-07-08T00:00:31Z"),
      rejectionReason: "deadline-closed",
    });

    const result = await submitPlayerAction({
      sessionId: "session-1",
      userId: "player-1",
      actionNonce: "nonce-1",
      actionType: "answer",
      payload: { answer: "A" },
      now: new Date("2026-07-08T00:00:31Z"),
    });

    expect(result.type).toBe("late");
    expect(dbMocks.tx.playerAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ rejectedAt: expect.any(Date) }),
      }),
    );
    expect(dbMocks.tx.antiCheatEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "LATE_INPUT", userId: "player-1" }),
      }),
    );
  });

  it("rejects replayed action nonce without creating another action", async () => {
    dbMocks.tx.liveSessionState.findUnique.mockResolvedValue({
      currentRoundId: "round-1",
      phase: "ROUND_ACTIVE",
    });
    dbMocks.tx.playerAction.findUnique.mockResolvedValue({
      id: "action-1",
      actionNonce: "nonce-1",
    });

    const result = await submitPlayerAction({
      sessionId: "session-1",
      userId: "player-1",
      actionNonce: "nonce-1",
      actionType: "answer",
      payload: { answer: "A" },
      now: new Date("2026-07-08T00:00:10Z"),
    });

    expect(result.type).toBe("duplicate");
    expect(dbMocks.tx.playerAction.create).not.toHaveBeenCalled();
    expect(dbMocks.tx.antiCheatEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "DOUBLE_SUBMIT", severity: "HIGH" }),
      }),
    );
  });

  it("signals auto-click action bursts without trusting the client", async () => {
    dbMocks.tx.liveSessionState.findUnique.mockResolvedValue({
      currentRoundId: "round-1",
      phase: "ROUND_ACTIVE",
    });
    dbMocks.tx.playerAction.findUnique.mockResolvedValue(null);
    dbMocks.tx.roundDeadline.findUnique.mockResolvedValue({
      roundId: "round-1",
      deadlineAt: new Date("2026-07-08T00:00:30Z"),
      closedAt: null,
    });
    dbMocks.tx.playerAction.count.mockResolvedValue(20);
    dbMocks.tx.playerAction.create.mockResolvedValue({
      id: "action-2",
      acceptedAt: new Date("2026-07-08T00:00:10Z"),
    });

    const result = await submitPlayerAction({
      sessionId: "session-1",
      userId: "player-1",
      actionNonce: "nonce-2",
      actionType: "answer",
      payload: { answer: "B" },
      now: new Date("2026-07-08T00:00:10Z"),
    });

    expect(result.type).toBe("accepted");
    expect(dbMocks.tx.antiCheatEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "AUTO_CLICK", severity: "HIGH" }),
      }),
    );
  });

  describe("consumeLiveReservation", () => {
    const BASE_NOW = new Date("2026-07-08T00:00:00Z");

    function baseSetup() {
      dbMocks.tx.liveReservation.findUnique.mockResolvedValue({
        id: "res-1",
        sessionId: "session-1",
        userId: "player-1",
        registrationId: "reg-1",
        tokenHash: "any-hash",
        expiresAt: new Date("2026-07-08T00:01:00Z"),
        consumedAt: null,
      });
      dbMocks.tx.gameSession.findUnique.mockResolvedValue({
        id: "session-1",
        status: "LIVE",
      });
      dbMocks.tx.playerConnection.upsert.mockResolvedValue({
        id: "pc-1",
        sessionId: "session-1",
        userId: "player-1",
      });
      dbMocks.tx.liveSessionState.upsert.mockResolvedValue({
        id: "ls-1",
        sessionId: "session-1",
        phase: "BRIEFING",
      });
      dbMocks.tx.auditLog.create.mockResolvedValue({ id: "audit-1" });
      dbMocks.tx.liveReservation.update.mockResolvedValue({ id: "res-1", consumedAt: BASE_NOW });
      vi.mocked(dbMocks.prisma.$transaction).mockImplementation(
        async (...args: unknown[]) => (args[0] as (tx: typeof dbMocks.tx) => unknown)(dbMocks.tx),
      );
    }

    it("consumes a valid reservation and returns ok", async () => {
      baseSetup();

      const result = await consumeLiveReservation({
        sessionId: "session-1",
        reservationToken: "test-token",
        roomId: "room-1",
        colyseusSessionId: "coly-1",
        now: BASE_NOW,
      });

      expect(result.type).toBe("ok");
      if (result.type === "ok") {
        expect(result.auth).toEqual({ userId: "player-1", registrationId: "reg-1" });
      }
      expect(dbMocks.tx.playerConnection.upsert).toHaveBeenCalledOnce();
      expect(dbMocks.tx.liveSessionState.upsert).toHaveBeenCalledOnce();
      expect(dbMocks.tx.auditLog.create).toHaveBeenCalledOnce();
    });

    it("retries on P2034 write conflict and succeeds", async () => {
      baseSetup();

      const p2034 = Object.assign(new Error("write conflict"), { code: "P2034" });
      vi.mocked(dbMocks.prisma.$transaction)
        .mockRejectedValueOnce(p2034)
        .mockImplementationOnce(
          async (...args: unknown[]) => (args[0] as (tx: typeof dbMocks.tx) => unknown)(dbMocks.tx),
        );

      const result = await consumeLiveReservation({
        sessionId: "session-1",
        reservationToken: "test-token",
        roomId: "room-1",
        colyseusSessionId: "coly-1",
        now: BASE_NOW,
      });

      expect(result.type).toBe("ok");
      expect(dbMocks.prisma.$transaction).toHaveBeenCalledTimes(2);
    });

    it("rejects expired reservation", async () => {
      baseSetup();
      dbMocks.tx.liveReservation.findUnique.mockResolvedValue({
        id: "res-expired",
        sessionId: "session-1",
        userId: "player-1",
        registrationId: "reg-1",
        tokenHash: "any-hash",
        expiresAt: new Date("2026-07-07T23:59:00Z"),
        consumedAt: null,
      });

      const result = await consumeLiveReservation({
        sessionId: "session-1",
        reservationToken: "expired-token",
        roomId: "room-1",
        colyseusSessionId: "coly-1",
        now: BASE_NOW,
      });

      expect(result.type).toBe("expired-reservation");
      expect(dbMocks.tx.playerConnection.upsert).not.toHaveBeenCalled();
    });

    it("rejects already consumed reservation", async () => {
      baseSetup();
      dbMocks.tx.liveReservation.findUnique.mockResolvedValue({
        id: "res-used",
        sessionId: "session-1",
        userId: "player-1",
        registrationId: "reg-1",
        tokenHash: "any-hash",
        expiresAt: new Date("2026-07-08T00:01:00Z"),
        consumedAt: new Date("2026-07-08T00:00:10Z"),
      });

      const result = await consumeLiveReservation({
        sessionId: "session-1",
        reservationToken: "used-token",
        roomId: "room-1",
        colyseusSessionId: "coly-1",
        now: BASE_NOW,
      });

      expect(result.type).toBe("used-reservation");
    });

    it("rejects when session is not LIVE", async () => {
      baseSetup();
      dbMocks.tx.gameSession.findUnique.mockResolvedValue({
        id: "session-1",
        status: "PUBLISHED",
      });

      const result = await consumeLiveReservation({
        sessionId: "session-1",
        reservationToken: "test-token",
        roomId: "room-1",
        colyseusSessionId: "coly-1",
        now: BASE_NOW,
      });

      expect(result.type).toBe("session-not-live");
    });
  });
});
