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
    sessionRegistration: {
      findMany: vi.fn(),
    },
    playerConnection: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      updateMany: vi.fn(),
    },
    liveSessionState: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    auditLog: {
      createMany: vi.fn(),
      create: vi.fn(),
    },
    roundInstance: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    roundDeadline: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
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
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
    roundParticipant: {
      createMany: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
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
      resolutionLog: {
        findUnique: vi.fn(),
      },
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
    RESOLVING: "RESOLVING",
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
    COMPLETED: "COMPLETED",
  },
  RoundOutcomeStatus: {
    ELIMINATED: "ELIMINATED",
  },
  RoundAdmissionLock: {
    CHALLENGE_REVEAL: "CHALLENGE_REVEAL",
    HAZARD_START: "HAZARD_START",
    MATCHMAKING_LOCK: "MATCHMAKING_LOCK",
    PAIRING_LOCK: "PAIRING_LOCK",
    TEAM_LOCK: "TEAM_LOCK",
    ROLE_ASSIGNMENT_LOCK: "ROLE_ASSIGNMENT_LOCK",
  },
  RoundParticipantStatus: {
    ACTIVE: "ACTIVE",
    NO_SHOW: "NO_SHOW",
  },
  SessionRegistrationStatus: {
    CHECKED_IN: "CHECKED_IN",
    IN_ROOM: "IN_ROOM",
  },
}));

vi.mock("../roundDeadlineQueue.js", () => queueMocks);

import {
  closeAndFinalizeRound,
  consumeLiveReservation,
  startRound,
  submitPlayerAction,
} from "../sessionStore.js";

describe("sessionStore live invariants", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
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
    dbMocks.tx.roundOutcome.findMany.mockResolvedValue([]);
    dbMocks.tx.roundOutcome.createMany.mockResolvedValue({ count: 0 });
    dbMocks.tx.roundParticipant.createMany.mockResolvedValue({ count: 2 });
    dbMocks.tx.roundParticipant.findMany.mockResolvedValue([
      { userId: "player-1", teamId: null, pairId: null, role: null },
      { userId: "player-2", teamId: null, pairId: null, role: null },
    ]);
    dbMocks.tx.roundParticipant.findUnique.mockResolvedValue({ status: "ACTIVE" });
    dbMocks.tx.sessionRegistration.findMany.mockResolvedValue([
      { userId: "player-1", status: "IN_ROOM" },
      { userId: "player-2", status: "IN_ROOM" },
    ]);
    dbMocks.tx.playerConnection.findMany.mockResolvedValue([
      { userId: "player-1" },
      { userId: "player-2" },
    ]);
    dbMocks.tx.roundInstance.findUnique.mockResolvedValue({ miniGameDefinitionId: null });
    dbMocks.tx.roundInstance.updateMany.mockResolvedValue({ count: 1 });
    dbMocks.tx.roundDeadline.updateMany.mockResolvedValue({ count: 1 });
    dbMocks.tx.liveSessionState.updateMany.mockResolvedValue({ count: 1 });
    dbMocks.tx.miniGameDefinition.findFirst.mockResolvedValue({
      id: "minigame-1",
      key: "memory-sequence",
      family: "SOLO",
      name: "Memory Sequence",
      defaultConfig: { sequenceLength: 3 },
    });
    dbMocks.tx.miniGameDefinition.findUnique.mockResolvedValue(null);
    dbMocks.prisma.resolutionLog.findUnique.mockResolvedValue(null);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          status: "finalized",
          resolutionLogId: "log-1",
          outputHash: "hash-1",
          output: {
            scores: { "player-1": 10, "player-2": 5 },
            ranks: { "player-1": 1, "player-2": 2 },
            qualifiedIds: ["player-1"],
            eliminatedIds: ["player-2"],
            tieGroups: [],
          },
        },
      }),
    });
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
    expect(dbMocks.tx.roundParticipant.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            userId: "player-1",
            status: "ACTIVE",
            admissionLock: "CHALLENGE_REVEAL",
          }),
        ]),
        skipDuplicates: true,
      }),
    );
  });

  it("marks checked-in players absent from the live room as no-show for the round", async () => {
    dbMocks.tx.sessionRegistration.findMany.mockResolvedValue([
      { userId: "player-1", status: "IN_ROOM" },
      { userId: "player-2", status: "CHECKED_IN" },
    ]);
    dbMocks.tx.playerConnection.findMany.mockResolvedValue([{ userId: "player-1" }]);
    dbMocks.tx.roundParticipant.findMany.mockResolvedValue([
      { userId: "player-1", teamId: null, pairId: null, role: null },
    ]);

    const result = await startRound({
      sessionId: "session-1",
      roundNum: 1,
      durationMs: 30_000,
      now: new Date("2026-07-08T00:00:00Z"),
    });

    expect(result.participants).toEqual([
      { userId: "player-1", teamId: null, pairId: null, role: null },
    ]);
    expect(dbMocks.tx.roundOutcome.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            userId: "player-2",
            status: "ELIMINATED",
            reason: "late-after-challenge-reveal",
          }),
        ],
        skipDuplicates: true,
      }),
    );
  });

  it("closes and finalizes a round from the room deadline without waiting for Redis pubsub", async () => {
    dbMocks.tx.roundDeadline.findUnique.mockResolvedValue({
      id: "deadline-1",
      sessionId: "session-1",
      roundId: "round-1",
      deadlineAt: new Date("2026-07-08T00:00:30Z"),
      closedAt: null,
      round: { id: "round-1", sessionId: "session-1", status: "ACTIVE" },
    });

    const result = await closeAndFinalizeRound({
      sessionId: "session-1",
      roundId: "round-1",
      now: new Date("2026-07-08T00:00:31Z"),
    });

    expect(result.type).toBe("resolved");
    if (result.type === "resolved") {
      expect(result.close).toBe("closed");
      expect(result.payload).toEqual({
        sessionId: "session-1",
        roundId: "round-1",
        scores: { "player-1": 10, "player-2": 5 },
        ranks: { "player-1": 1, "player-2": 2 },
        qualifiedIds: ["player-1"],
        eliminatedIds: ["player-2"],
        tieGroups: [],
      });
    }
    expect(dbMocks.tx.roundDeadline.updateMany).toHaveBeenCalledWith({
      where: { id: "deadline-1", closedAt: null },
      data: { closedAt: new Date("2026-07-08T00:00:31Z") },
    });
    expect(dbMocks.tx.roundInstance.updateMany).toHaveBeenCalledWith({
      where: { id: "round-1", sessionId: "session-1" },
      data: {
        status: "COMPLETED",
        endTime: new Date("2026-07-08T00:00:31Z"),
      },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/internal/rounds/round-1/finalize",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("does not close a round before the official deadline", async () => {
    dbMocks.tx.roundDeadline.findUnique.mockResolvedValue({
      id: "deadline-1",
      sessionId: "session-1",
      roundId: "round-1",
      deadlineAt: new Date("2026-07-08T00:00:30Z"),
      closedAt: null,
      round: { id: "round-1", sessionId: "session-1", status: "ACTIVE" },
    });

    const result = await closeAndFinalizeRound({
      sessionId: "session-1",
      roundId: "round-1",
      now: new Date("2026-07-08T00:00:29Z"),
    });

    expect(result.type).toBe("deadline-not-reached");
    expect(dbMocks.tx.roundDeadline.updateMany).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses persisted resolution output when the round was already finalized by the worker", async () => {
    dbMocks.tx.roundDeadline.findUnique.mockResolvedValue({
      id: "deadline-1",
      sessionId: "session-1",
      roundId: "round-1",
      deadlineAt: new Date("2026-07-08T00:00:30Z"),
      closedAt: new Date("2026-07-08T00:00:31Z"),
      round: { id: "round-1", sessionId: "session-1", status: "COMPLETED" },
    });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          status: "already-finalized",
          resolutionLogId: "log-1",
          outputHash: "hash-1",
        },
      }),
    });
    dbMocks.prisma.resolutionLog.findUnique.mockResolvedValue({
      outputSnapshot: {
        scores: { "player-1": 1 },
        ranks: { "player-1": 1 },
        qualifiedIds: ["player-1"],
        eliminatedIds: [],
        tieGroups: [],
      },
    });

    const result = await closeAndFinalizeRound({
      sessionId: "session-1",
      roundId: "round-1",
      now: new Date("2026-07-08T00:00:32Z"),
    });

    expect(result.type).toBe("resolved");
    if (result.type === "resolved") {
      expect(result.close).toBe("already-closed");
      expect(result.payload.qualifiedIds).toEqual(["player-1"]);
    }
    expect(dbMocks.tx.roundDeadline.updateMany).not.toHaveBeenCalled();
    expect(dbMocks.prisma.resolutionLog.findUnique).toHaveBeenCalledWith({
      where: { roundId: "round-1" },
      select: { outputSnapshot: true },
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

  it("rejects actions from players who are not active round participants", async () => {
    dbMocks.tx.liveSessionState.findUnique.mockResolvedValue({
      currentRoundId: "round-1",
      phase: "ROUND_ACTIVE",
    });
    dbMocks.tx.roundParticipant.findUnique.mockResolvedValue({ status: "NO_SHOW" });

    const result = await submitPlayerAction({
      sessionId: "session-1",
      userId: "player-1",
      actionNonce: "nonce-locked",
      actionType: "answer",
      payload: { answer: "B" },
      now: new Date("2026-07-08T00:00:10Z"),
    });

    expect(result.type).toBe("round-participant-inactive");
    expect(dbMocks.tx.playerAction.create).not.toHaveBeenCalled();
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
