import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  tx: {
    prizeDistribution: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    ledgerEntry: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    wallet: {
      upsert: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
  prisma: {
    $transaction: vi.fn(),
    prizeDistribution: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    gameEvent: {
      create: vi.fn(),
    },
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
  Prisma: {
    TransactionIsolationLevel: { Serializable: "Serializable" },
  },
  LedgerDirection: {
    CREDIT: "CREDIT",
    DEBIT: "DEBIT",
  },
  LedgerType: {
    PRIZE: "PRIZE",
  },
  GameResultStatus: {
    WINNER: "WINNER",
    ELIMINATED: "ELIMINATED",
    COMPLETED: "COMPLETED",
  },
  PrizeDistributionStatus: {
    PENDING: "PENDING",
    CREDITED: "CREDITED",
    FAILED: "FAILED",
  },
}));

import { processCreditsDistribution } from "../creditsDistribution.js";

function distribution(overrides: Record<string, unknown> = {}) {
  return {
    id: "distribution-1",
    sessionId: "session-1",
    userId: "winner-1",
    amountXaf: 1000,
    rank: 1,
    status: "PENDING",
    idempotencyKey: "session:session-1:winner:winner-1:prize:v1",
    paidAt: null,
    creditedAt: null,
    ...overrides,
  };
}

describe("credits distribution worker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.prisma.$transaction.mockImplementation(async (callback) => callback(dbMocks.tx));
    dbMocks.prisma.prizeDistribution.findMany.mockResolvedValue([distribution()]);
    dbMocks.prisma.prizeDistribution.count.mockResolvedValue(0);
    dbMocks.tx.prizeDistribution.findUnique.mockResolvedValue(distribution());
    dbMocks.tx.ledgerEntry.findUnique.mockResolvedValue(null);
    dbMocks.tx.wallet.upsert.mockResolvedValue({
      id: "wallet-1",
      userId: "winner-1",
      balanceXaf: 200,
      isFrozen: false,
    });
    dbMocks.tx.ledgerEntry.create.mockResolvedValue({ id: "ledger-1" });
    dbMocks.tx.wallet.update.mockResolvedValue({ id: "wallet-1", balanceXaf: 1200 });
    dbMocks.tx.prizeDistribution.update.mockResolvedValue({
      ...distribution(),
      status: "CREDITED",
    });
    dbMocks.prisma.gameResult.findMany.mockResolvedValue([
      { finalRank: 1, finalStatus: "WINNER" },
    ]);
    dbMocks.prisma.ledgerEntry.aggregate.mockResolvedValue({ _sum: { amountXaf: 1000 } });
    dbMocks.prisma.playerStatsSnapshot.upsert.mockResolvedValue({
      id: "stats-1",
      userId: "winner-1",
      sessionsPlayed: 1,
      sessionsWon: 1,
      winRate: 1,
      avgFinalRank: 1,
      creditsWonXaf: 1000,
    });
    dbMocks.prisma.auditLog.create.mockResolvedValue({});
  });

  it("credits pending distributions through an idempotent ledger key", async () => {
    const result = await processCreditsDistribution(
      { sessionId: "session-1" },
      new Date("2026-07-08T00:00:00Z"),
    );

    expect(result).toMatchObject({ credited: 1, remaining: 0 });
    expect(dbMocks.tx.ledgerEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        idempotencyKey: "session:session-1:winner:winner-1:prize:v1",
        amountXaf: 1000,
        balanceAfterXaf: 1200,
      }),
    });
    expect(dbMocks.tx.prizeDistribution.update).toHaveBeenCalledWith({
      where: { id: "distribution-1" },
      data: expect.objectContaining({ status: "CREDITED" }),
    });
    expect(dbMocks.prisma.playerStatsSnapshot.upsert).toHaveBeenCalledWith({
      where: { userId: "winner-1" },
      update: expect.objectContaining({
        sessionsPlayed: 1,
        sessionsWon: 1,
        creditsWonXaf: 1000,
      }),
      create: expect.objectContaining({
        userId: "winner-1",
        sessionsPlayed: 1,
        sessionsWon: 1,
        creditsWonXaf: 1000,
      }),
    });
  });

  it("resumes after a partial crash without double crediting", async () => {
    dbMocks.tx.ledgerEntry.findUnique.mockResolvedValueOnce({ id: "ledger-1" });

    const result = await processCreditsDistribution(
      { sessionId: "session-1" },
      new Date("2026-07-08T00:00:00Z"),
    );

    expect(result).toMatchObject({ credited: 1, remaining: 0 });
    expect(dbMocks.tx.ledgerEntry.create).not.toHaveBeenCalled();
    expect(dbMocks.tx.prizeDistribution.update).toHaveBeenCalledWith({
      where: { id: "distribution-1" },
      data: expect.objectContaining({ status: "CREDITED" }),
    });
    expect(dbMocks.prisma.playerStatsSnapshot.upsert).toHaveBeenCalled();
  });
});
