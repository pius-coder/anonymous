import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  prisma: {
    gameResult: {
      findMany: vi.fn(),
    },
    ledgerEntry: {
      aggregate: vi.fn(),
    },
    playerStatsSnapshot: {
      upsert: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@session-jeu/db", () => ({
  prisma: dbMocks.prisma,
  GameResultStatus: {
    WINNER: "WINNER",
    ELIMINATED: "ELIMINATED",
    COMPLETED: "COMPLETED",
  },
  GameSessionStatus: {
    ACTIVE: "ACTIVE",
    WAITING_START: "WAITING_START",
    LIVE: "LIVE",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED",
  },
  LedgerDirection: {
    CREDIT: "CREDIT",
  },
  LedgerType: {
    PRIZE: "PRIZE",
  },
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code: string;

      constructor(code: string) {
        super(code);
        this.code = code;
      }
    },
  },
  SessionRegistrationStatus: {
    NO_SHOW: "NO_SHOW",
    CANCELLED: "CANCELLED",
    REFUNDED: "REFUNDED",
    EXPIRED: "EXPIRED",
  },
}));

import { calculatePlayerStats, historyBucket, recomputePlayerStats } from "../playerProfile.js";

describe("player profile stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("derives stats from official game results and prize ledger", () => {
    const stats = calculatePlayerStats({
      gameResults: [
        { finalRank: 1, finalStatus: "WINNER" },
        { finalRank: 3, finalStatus: "ELIMINATED" },
        { finalRank: 2, finalStatus: "COMPLETED" },
      ],
      prizeLedger: { _sum: { amountXaf: 2500 } },
    });

    expect(stats).toEqual({
      sessionsPlayed: 3,
      sessionsWon: 1,
      winRate: 1 / 3,
      avgFinalRank: 2,
      creditsWonXaf: 2500,
    });
  });

  it("classifies expired payment reservations as cancelled history", () => {
    expect(
      historyBucket({
        registrationStatus: "EXPIRED",
        sessionStatus: "ACTIVE",
        startTime: new Date("2026-07-20T10:00:00Z"),
        now: new Date("2026-07-11T10:00:00Z"),
      }),
    ).toBe("cancelled");
  });

  it("recomputes and upserts the snapshot from GameResult and LedgerEntry", async () => {
    const now = new Date("2026-07-08T10:00:00Z");
    dbMocks.prisma.gameResult.findMany.mockResolvedValue([
      { finalRank: 1, finalStatus: "WINNER" },
      { finalRank: 4, finalStatus: "ELIMINATED" },
    ]);
    dbMocks.prisma.ledgerEntry.aggregate.mockResolvedValue({ _sum: { amountXaf: 4200 } });
    dbMocks.prisma.playerStatsSnapshot.upsert.mockResolvedValue({
      id: "snapshot-1",
      userId: "player-1",
      sessionsPlayed: 2,
      sessionsWon: 1,
      winRate: 0.5,
      avgFinalRank: 2.5,
      creditsWonXaf: 4200,
      computedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    dbMocks.prisma.auditLog.create.mockResolvedValue({});

    const snapshot = await recomputePlayerStats("player-1", now);

    expect(dbMocks.prisma.gameResult.findMany).toHaveBeenCalledWith({
      where: { userId: "player-1" },
      select: { finalRank: true, finalStatus: true },
    });
    expect(dbMocks.prisma.ledgerEntry.aggregate).toHaveBeenCalledWith({
      where: {
        userId: "player-1",
        direction: "CREDIT",
        type: "PRIZE",
      },
      _sum: { amountXaf: true },
    });
    expect(dbMocks.prisma.playerStatsSnapshot.upsert).toHaveBeenCalledWith({
      where: { userId: "player-1" },
      update: {
        sessionsPlayed: 2,
        sessionsWon: 1,
        winRate: 0.5,
        avgFinalRank: 2.5,
        creditsWonXaf: 4200,
        computedAt: now,
      },
      create: {
        userId: "player-1",
        sessionsPlayed: 2,
        sessionsWon: 1,
        winRate: 0.5,
        avgFinalRank: 2.5,
        creditsWonXaf: 4200,
        computedAt: now,
      },
    });
    expect(snapshot.id).toBe("snapshot-1");
    expect(dbMocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "stats.recomputed",
          entity: "PlayerStatsSnapshot",
          entityId: "snapshot-1",
        }),
      }),
    );
  });
});
