import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashResolution, resolveRound, type ResolverInput } from "@session-jeu/game-engine";

const dbMocks = vi.hoisted(() => {
  const tx = {
    resolutionLog: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    roundInstance: {
      findUnique: vi.fn(),
    },
    roundParticipant: {
      findMany: vi.fn(),
    },
    roundResult: {
      createMany: vi.fn(),
    },
    roundOutcome: {
      createMany: vi.fn(),
    },
    gameEvent: {
      createMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  };

  return {
    tx,
    prisma: {
      $transaction: vi.fn(),
      resolutionLog: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      gameEvent: {
        create: vi.fn(),
      },
    },
  };
});

vi.mock("@session-jeu/db", () => ({
  prisma: dbMocks.prisma,
  Prisma: {
    TransactionIsolationLevel: { Serializable: "Serializable" },
  },
  RoundOutcomeStatus: {
    QUALIFIED: "QUALIFIED",
    ELIMINATED: "ELIMINATED",
  },
  RoundParticipantStatus: {
    ACTIVE: "ACTIVE",
  },
  RoundStatus: {
    COMPLETED: "COMPLETED",
    ACTIVE: "ACTIVE",
  },
  SessionRegistrationStatus: {
    CREATED: "CREATED",
    PAYMENT_PENDING: "PAYMENT_PENDING",
    PAID: "PAID",
    CHECKED_IN: "CHECKED_IN",
    IN_ROOM: "IN_ROOM",
  },
}));

import { finalizeRound, replayRound } from "../roundResolution.js";

function resolverInput(): ResolverInput {
  return {
    roundId: "round-1",
    participants: ["player-1", "player-2"],
    config: { family: "solo-score", winnersCount: 1 },
    actions: [
      {
        playerId: "player-1",
        actionNonce: "nonce-1",
        submittedAt: "2026-07-08T00:00:01.000Z",
        payload: { score: 10, tieBreakMs: 100 },
      },
      {
        playerId: "player-2",
        actionNonce: "nonce-2",
        submittedAt: "2026-07-08T00:00:02.000Z",
        payload: { score: 5, tieBreakMs: 120 },
      },
    ],
    seedLog: [],
  };
}

describe("round resolution service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.prisma.$transaction.mockImplementation(async (input) =>
      typeof input === "function" ? input(dbMocks.tx) : input,
    );
    dbMocks.tx.resolutionLog.findUnique.mockResolvedValue(null);
    dbMocks.tx.roundInstance.findUnique.mockResolvedValue({
      id: "round-1",
      sessionId: "session-1",
      status: "COMPLETED",
      session: { id: "session-1" },
      playerActions: [
        {
          userId: "player-1",
          actionNonce: "nonce-1",
          acceptedAt: new Date("2026-07-08T00:00:01Z"),
          createdAt: new Date("2026-07-08T00:00:01Z"),
          payload: { score: 10, tieBreakMs: 100 },
        },
        {
          userId: "player-2",
          actionNonce: "nonce-2",
          acceptedAt: new Date("2026-07-08T00:00:02Z"),
          createdAt: new Date("2026-07-08T00:00:02Z"),
          payload: { score: 5, tieBreakMs: 120 },
        },
      ],
    });
    dbMocks.tx.roundParticipant.findMany.mockResolvedValue([
      { userId: "player-1" },
      { userId: "player-2" },
    ]);
    dbMocks.tx.roundResult.createMany.mockResolvedValue({ count: 2 });
    dbMocks.tx.roundOutcome.createMany.mockResolvedValue({ count: 2 });
    dbMocks.tx.resolutionLog.create.mockResolvedValue({
      id: "resolution-1",
      roundId: "round-1",
      outputHash: "output-hash",
    });
    dbMocks.tx.gameEvent.createMany.mockResolvedValue({ count: 3 });
    dbMocks.tx.auditLog.create.mockResolvedValue({});
  });

  it("finalizes a closed round transactionally", async () => {
    const result = await finalizeRound({
      roundId: "round-1",
      config: { family: "solo-score", winnersCount: 1 },
    });

    expect(result.type).toBe("ok");
    expect(dbMocks.tx.roundResult.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true }),
    );
    expect(dbMocks.tx.roundOutcome.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true }),
    );
    expect(dbMocks.tx.resolutionLog.create).toHaveBeenCalled();
  });

  it("returns idempotently when a resolution log already exists", async () => {
    dbMocks.tx.resolutionLog.findUnique.mockResolvedValue({
      id: "resolution-1",
      roundId: "round-1",
      outputHash: "output-hash",
    });

    const result = await finalizeRound({
      roundId: "round-1",
      config: { family: "solo-score", winnersCount: 1 },
    });

    expect(result.type).toBe("already-finalized");
    expect(dbMocks.tx.roundResult.createMany).not.toHaveBeenCalled();
  });

  it("refuses to finalize a round that is not locked closed", async () => {
    dbMocks.tx.roundInstance.findUnique.mockResolvedValue({
      id: "round-1",
      sessionId: "session-1",
      status: "ACTIVE",
      session: { id: "session-1" },
      playerActions: [],
    });

    const result = await finalizeRound({
      roundId: "round-1",
      config: { family: "solo-score", winnersCount: 1 },
    });

    expect(result).toEqual({ type: "round-not-locked", status: "ACTIVE" });
  });

  it("replays a finalized round and reports hash match", async () => {
    const input = resolverInput();
    const outputHash = hashResolution(resolveRound(input));
    dbMocks.prisma.resolutionLog.findUnique.mockResolvedValue({
      id: "resolution-1",
      roundId: "round-1",
      sessionId: "session-1",
      inputSnapshot: input,
      outputHash,
    });
    dbMocks.prisma.resolutionLog.update.mockReturnValue({});
    dbMocks.prisma.gameEvent.create.mockReturnValue({});

    const result = await replayRound("round-1");

    expect(result.type).toBe("ok");
    if (result.type === "ok") {
      expect(result.matched).toBe(true);
      expect(result.actualOutputHash).toBe(outputHash);
    }
  });
});
