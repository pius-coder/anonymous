import { z } from "zod";
import {
  DisputeWindowStatus,
  GameResultStatus,
  GameSessionStatus,
  LedgerDirection,
  LedgerType,
  Prisma,
  PrizeDistributionStatus,
  RoundingRemainderPolicy,
  RoundOutcomeStatus,
  prisma,
} from "@session-jeu/db";
import { withSerializableRetry } from "../registrations/sessionRegistration.js";
import { queueNotificationSafely } from "../notifications/notifications.js";

export const DISPUTE_WINDOW_MS = 24 * 60 * 60 * 1000;

export const sessionResultsParamsSchema = z.object({
  id: z.string().min(1),
});

export const finalizeSessionSchema = z.object({
  tiePolicy: z.enum(["USER_ID_ASC"]).optional(),
  remainderPolicy: z.enum(["FIRST_WINNER", "PLATFORM_COMMISSION"]).default("FIRST_WINNER"),
  reason: z.string().trim().min(3).max(500).optional(),
});

export const correctionRequestSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

type WinnerCandidate = {
  userId: string;
  totalScore: number;
  eliminated: boolean;
};

type WalletSnapshot = {
  id: string;
  userId: string;
  balanceXaf: number;
  currency: string;
  isFrozen: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

function parseWinnerSplitBps(value: unknown): number[] {
  if (!Array.isArray(value)) return [10000];
  const numbers = value.filter((item): item is number => Number.isInteger(item) && item >= 0);
  return numbers.length > 0 ? numbers : [10000];
}

function serializeDate(date: Date | null | undefined) {
  return date?.toISOString() ?? null;
}

function serializeWalletSnapshot(wallet: WalletSnapshot) {
  return {
    id: wallet.id,
    userId: wallet.userId,
    balanceXaf: wallet.balanceXaf,
    currency: wallet.currency,
    isFrozen: wallet.isFrozen,
    version: wallet.version,
    createdAt: wallet.createdAt.toISOString(),
    updatedAt: wallet.updatedAt.toISOString(),
  };
}

export function calculatePrizeDistribution(input: {
  paidRegistrationsCount: number;
  entryFeeXaf: number;
  providerFeeBps: number;
  prizePoolBps: number;
  winnerSplitBps: number[];
  remainderPolicy?: RoundingRemainderPolicy | "FIRST_WINNER" | "PLATFORM_COMMISSION";
}) {
  const grossCollectionXaf = input.paidRegistrationsCount * input.entryFeeXaf;
  const providerFeesXaf = Math.floor((grossCollectionXaf * input.providerFeeBps) / 10000);
  const netCollectionXaf = grossCollectionXaf - providerFeesXaf;
  const prizePoolXaf = Math.floor((netCollectionXaf * input.prizePoolBps) / 10000);
  const baseShares = input.winnerSplitBps.map((split) =>
    Math.floor((prizePoolXaf * split) / 10000),
  );
  const roundingRemainderXaf = prizePoolXaf - baseShares.reduce((sum, share) => sum + share, 0);
  const winnerSharesXaf = [...baseShares];
  const remainderPolicy = input.remainderPolicy ?? RoundingRemainderPolicy.FIRST_WINNER;

  if (roundingRemainderXaf > 0 && remainderPolicy === RoundingRemainderPolicy.FIRST_WINNER) {
    winnerSharesXaf[0] = (winnerSharesXaf[0] ?? 0) + roundingRemainderXaf;
  }

  const distributedPrizeXaf = winnerSharesXaf.reduce((sum, share) => sum + share, 0);
  const organizationCommissionXaf = netCollectionXaf - distributedPrizeXaf;

  return {
    grossCollectionXaf,
    providerFeesXaf,
    netCollectionXaf,
    prizePoolXaf,
    organizationCommissionXaf,
    roundingRemainderXaf,
    remainderPolicy,
    winnerSharesXaf,
  };
}

function rankCandidates(candidates: WinnerCandidate[]) {
  return [...candidates]
    .sort((a, b) => {
      if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1;
      if (a.totalScore !== b.totalScore) return b.totalScore - a.totalScore;
      return a.userId.localeCompare(b.userId);
    })
    .map((candidate, index) => ({ ...candidate, finalRank: index + 1 }));
}

function hasTieAtWinnerBoundary(input: { ranked: ReturnType<typeof rankCandidates>; winnersCount: number }) {
  if (input.winnersCount <= 0 || input.ranked.length <= input.winnersCount) return false;
  const lastWinner = input.ranked[input.winnersCount - 1];
  const firstLoser = input.ranked[input.winnersCount];
  if (!lastWinner || !firstLoser) return false;
  return (
    lastWinner.eliminated === firstLoser.eliminated &&
    lastWinner.totalScore === firstLoser.totalScore
  );
}

function serializeGameResult(result: {
  id: string;
  sessionId: string;
  userId: string;
  finalRank: number | null;
  totalScore: number;
  finalStatus: string;
  prizeWonXaf: number;
  finalizedAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: result.id,
    sessionId: result.sessionId,
    userId: result.userId,
    finalRank: result.finalRank,
    totalScore: result.totalScore,
    finalStatus: result.finalStatus,
    prizeWonXaf: result.prizeWonXaf,
    finalizedAt: serializeDate(result.finalizedAt),
    createdAt: result.createdAt.toISOString(),
  };
}

function serializePrizeDistribution(distribution: {
  id: string;
  sessionId: string;
  userId: string;
  amountXaf: number;
  rank: number;
  status: string;
  paidAt: Date | null;
  creditedAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: distribution.id,
    sessionId: distribution.sessionId,
    userId: distribution.userId,
    amountXaf: distribution.amountXaf,
    rank: distribution.rank,
    status: distribution.status,
    paidAt: serializeDate(distribution.paidAt),
    creditedAt: serializeDate(distribution.creditedAt),
    createdAt: distribution.createdAt.toISOString(),
  };
}

function serializeCommission(commission: {
  grossCollectionXaf: number;
  providerFeesXaf: number;
  netCollectionXaf: number;
  prizePoolXaf: number;
  organizationCommissionXaf: number;
  roundingRemainderXaf: number;
  roundingRemainderPolicy: string;
} | null) {
  if (!commission) return null;
  return {
    grossCollectionXaf: commission.grossCollectionXaf,
    providerFeesXaf: commission.providerFeesXaf,
    netCollectionXaf: commission.netCollectionXaf,
    prizePoolXaf: commission.prizePoolXaf,
    organizationCommissionXaf: commission.organizationCommissionXaf,
    roundingRemainderXaf: commission.roundingRemainderXaf,
    roundingRemainderPolicy: commission.roundingRemainderPolicy,
  };
}

export async function finalizeSessionResults(input: {
  sessionId: string;
  adminUserId: string;
  tiePolicy?: "USER_ID_ASC";
  remainderPolicy?: "FIRST_WINNER" | "PLATFORM_COMMISSION";
  reason?: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();

  const result = await withSerializableRetry(() =>
    prisma.$transaction(
      async (tx) => {
        const existingCommission = await tx.commissionRecord.findUnique({
          where: { sessionId: input.sessionId },
        });
        if (existingCommission) {
          return { type: "already-finalized" as const, commission: existingCommission };
        }

        const session = await tx.gameSession.findUnique({
          where: { id: input.sessionId },
          include: {
            registrations: {
              where: { status: "PAID" },
              select: { userId: true },
            },
            rounds: {
              include: {
                results: true,
                outcomes: true,
              },
              orderBy: { roundNum: "asc" },
            },
          },
        });

        if (!session) return { type: "not-found" as const };
        if (session.status === GameSessionStatus.CANCELLED) {
          return { type: "not-ready" as const, reason: "session-cancelled" };
        }
        const finalizableStatuses: GameSessionStatus[] = [
          GameSessionStatus.ACTIVE,
          GameSessionStatus.WAITING_START,
          GameSessionStatus.LIVE,
          GameSessionStatus.COMPLETED,
        ];
        if (!finalizableStatuses.includes(session.status)) {
          return { type: "not-ready" as const, reason: "invalid-session-status" };
        }
        if (session.registrations.length === 0) {
          return { type: "not-ready" as const, reason: "no-paid-registrations" };
        }
        if (session.rounds.length === 0) {
          return { type: "not-ready" as const, reason: "no-rounds" };
        }

        const paidUserIds = new Set(session.registrations.map((registration) => registration.userId));
        const candidates = [...paidUserIds].map((userId) => {
          const totalScore = session.rounds.reduce((sum, round) => {
            const result = round.results.find((roundResult) => roundResult.playerId === userId);
            return sum + (result?.score ?? 0);
          }, 0);
          const eliminated = session.rounds.some((round) =>
            round.outcomes.some(
              (outcome) =>
                outcome.userId === userId && outcome.status === RoundOutcomeStatus.ELIMINATED,
            ),
          );
          return { userId, totalScore, eliminated };
        });

        const ranked = rankCandidates(candidates);
        const winnerSplitBps = parseWinnerSplitBps(session.winnerSplitBps);
        const winnersCount = Math.min(winnerSplitBps.length, ranked.length);
        if (hasTieAtWinnerBoundary({ ranked, winnersCount }) && !input.tiePolicy) {
          return { type: "tie-policy-required" as const };
        }

        const financials = calculatePrizeDistribution({
          paidRegistrationsCount: session.registrations.length,
          entryFeeXaf: session.entryFeeXaf,
          providerFeeBps: session.providerFeeBps,
          prizePoolBps: session.prizePoolBps,
          winnerSplitBps: winnerSplitBps.slice(0, winnersCount),
          remainderPolicy: input.remainderPolicy ?? "FIRST_WINNER",
        });

        const prizeByUserId = new Map<string, number>();
        ranked.slice(0, winnersCount).forEach((winner, index) => {
          prizeByUserId.set(winner.userId, financials.winnerSharesXaf[index] ?? 0);
        });

        await tx.gameResult.createMany({
          data: ranked.map((candidate) => {
            const prizeWonXaf = prizeByUserId.get(candidate.userId) ?? 0;
            return {
              sessionId: session.id,
              userId: candidate.userId,
              finalRank: candidate.finalRank,
              totalScore: candidate.totalScore,
              finalStatus:
                prizeWonXaf > 0
                  ? GameResultStatus.WINNER
                  : candidate.eliminated
                    ? GameResultStatus.ELIMINATED
                    : GameResultStatus.COMPLETED,
              prizeWon: prizeWonXaf,
              prizeWonXaf,
              idempotencyKey: `game-result:${session.id}:${candidate.userId}:v1`,
              finalizedAt: now,
            };
          }),
          skipDuplicates: true,
        });

        await tx.prizeDistribution.createMany({
          data: ranked.slice(0, winnersCount).map((winner, index) => {
            const amountXaf = financials.winnerSharesXaf[index] ?? 0;
            return {
              sessionId: session.id,
              userId: winner.userId,
              amount: amountXaf,
              amountXaf,
              rank: winner.finalRank,
              status: PrizeDistributionStatus.PENDING,
              idempotencyKey: prizeDistributionIdempotencyKey({
                sessionId: session.id,
                userId: winner.userId,
              }),
            };
          }),
          skipDuplicates: true,
        });

        const commission = await tx.commissionRecord.create({
          data: {
            sessionId: session.id,
            grossCollectionXaf: financials.grossCollectionXaf,
            providerFeesXaf: financials.providerFeesXaf,
            netCollectionXaf: financials.netCollectionXaf,
            prizePoolXaf: financials.prizePoolXaf,
            organizationCommissionXaf: financials.organizationCommissionXaf,
            roundingRemainderXaf: financials.roundingRemainderXaf,
            roundingRemainderPolicy:
              financials.remainderPolicy === "PLATFORM_COMMISSION"
                ? RoundingRemainderPolicy.PLATFORM_COMMISSION
                : RoundingRemainderPolicy.FIRST_WINNER,
            idempotencyKey: `commission:${session.id}:v1`,
          },
        });

        const disputeWindow = await tx.disputeWindow.create({
          data: {
            sessionId: session.id,
            status: DisputeWindowStatus.OPEN,
            opensAt: now,
            closesAt: new Date(now.getTime() + DISPUTE_WINDOW_MS),
          },
        });

        await tx.gameSession.update({
          where: { id: session.id },
          data: {
            status: GameSessionStatus.COMPLETED,
            endTime: now,
          },
        });

        await tx.gameEvent.createMany({
          data: [
            {
              sessionId: session.id,
              eventType: "session.finished",
              aggregateType: "GameSession",
              aggregateId: session.id,
              payload: { status: GameSessionStatus.COMPLETED },
            },
            {
              sessionId: session.id,
              eventType: "results.computed",
              aggregateType: "GameSession",
              aggregateId: session.id,
              payload: {
                winners: ranked.slice(0, winnersCount).map((winner) => winner.userId),
                commissionId: commission.id,
              },
            },
            {
              sessionId: session.id,
              eventType: "credits.distribution-started",
              aggregateType: "GameSession",
              aggregateId: session.id,
              payload: { jobId: creditsDistributionJobId(session.id) },
            },
          ],
        });

        await tx.auditLog.create({
          data: {
            userId: input.adminUserId,
            action: "session.results-finalized",
            entity: "GameSession",
            entityId: session.id,
            reason: input.reason,
            newData: {
              commission: serializeCommission(commission),
              disputeWindowId: disputeWindow.id,
              winnerIds: ranked.slice(0, winnersCount).map((winner) => winner.userId),
            },
          },
        });

        return {
          type: "ok" as const,
          sessionId: session.id,
          commission,
          winnerCount: winnersCount,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 10000,
      },
    ),
  );

  if (result.type === "ok") {
    const results = await prisma.gameResult.findMany({
      where: { sessionId: input.sessionId },
      select: { id: true, userId: true, finalRank: true, finalStatus: true, prizeWonXaf: true },
    });
    await Promise.all(
      results.map((entry) =>
        queueNotificationSafely({
          userId: entry.userId,
          sessionId: input.sessionId,
          type: "RESULT",
          channel: "IN_APP",
          title: "Resultats disponibles",
          body: `Votre classement final est ${entry.finalRank ?? "non classe"}.`,
          idempotencyKey: `game-result:${entry.id}:published:in-app`,
          payload: {
            resultId: entry.id,
            finalRank: entry.finalRank,
            finalStatus: entry.finalStatus,
            prizeWonXaf: entry.prizeWonXaf,
          },
        }),
      ),
    );
  }

  return result;
}

export function creditsDistributionJobId(sessionId: string) {
  return `credits.distribute:${sessionId}`;
}

export function prizeDistributionIdempotencyKey(input: { sessionId: string; userId: string }) {
  return `session:${input.sessionId}:winner:${input.userId}:prize:v1`;
}

export async function getSessionResultsForPlayer(input: { sessionId: string; userId: string }) {
  const registration = await prisma.sessionRegistration.findFirst({
    where: { sessionId: input.sessionId, userId: input.userId },
    select: { id: true },
  });
  if (!registration) return { type: "forbidden" as const };

  const session = await prisma.gameSession.findUnique({
    where: { id: input.sessionId },
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      gameResults: { orderBy: [{ finalRank: "asc" }, { userId: "asc" }] },
      prizeDistributions: { orderBy: [{ rank: "asc" }, { userId: "asc" }] },
      disputeWindow: true,
    },
  });
  if (!session) return { type: "not-found" as const };
  if (session.status !== GameSessionStatus.COMPLETED || session.gameResults.length === 0) {
    return { type: "not-finalized" as const };
  }

  return {
    type: "ok" as const,
    session: {
      id: session.id,
      code: session.code,
      name: session.name,
      status: session.status,
    },
    results: session.gameResults.map(serializeGameResult),
    distributions: session.prizeDistributions.map(serializePrizeDistribution),
    disputeWindow: session.disputeWindow
      ? {
          status: session.disputeWindow.status,
          closesAt: session.disputeWindow.closesAt.toISOString(),
        }
      : null,
  };
}

export async function getSessionResultsForAdmin(sessionId: string) {
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: {
      gameResults: { orderBy: [{ finalRank: "asc" }, { userId: "asc" }] },
      prizeDistributions: { orderBy: [{ rank: "asc" }, { userId: "asc" }] },
      commissionRecord: true,
      disputeWindow: true,
    },
  });
  if (!session) return { type: "not-found" as const };

  return {
    type: "ok" as const,
    session: {
      id: session.id,
      code: session.code,
      name: session.name,
      status: session.status,
      entryFeeXaf: session.entryFeeXaf,
      prizePoolBps: session.prizePoolBps,
      providerFeeBps: session.providerFeeBps,
      winnerSplitBps: parseWinnerSplitBps(session.winnerSplitBps),
    },
    results: session.gameResults.map(serializeGameResult),
    distributions: session.prizeDistributions.map(serializePrizeDistribution),
    commission: serializeCommission(session.commissionRecord),
    disputeWindow: session.disputeWindow
      ? {
          id: session.disputeWindow.id,
          status: session.disputeWindow.status,
          opensAt: session.disputeWindow.opensAt.toISOString(),
          closesAt: session.disputeWindow.closesAt.toISOString(),
          requestReason: session.disputeWindow.requestReason,
          requestedById: session.disputeWindow.requestedById,
          requestedAt: serializeDate(session.disputeWindow.requestedAt),
        }
      : null,
  };
}

export async function requestResultsCorrection(input: {
  sessionId: string;
  adminUserId: string;
  reason: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  return withSerializableRetry(() =>
    prisma.$transaction(
      async (tx) => {
        const session = await tx.gameSession.findUnique({
          where: { id: input.sessionId },
          include: { disputeWindow: true },
        });
        if (!session) return { type: "not-found" as const };
        if (session.status !== GameSessionStatus.COMPLETED || !session.disputeWindow) {
          return { type: "not-finalized" as const };
        }

        const disputeWindow = await tx.disputeWindow.update({
          where: { sessionId: input.sessionId },
          data: {
            status: DisputeWindowStatus.CORRECTION_REQUESTED,
            requestedById: input.adminUserId,
            requestReason: input.reason,
            requestedAt: now,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: input.adminUserId,
            action: "results.correction-requested",
            entity: "GameSession",
            entityId: input.sessionId,
            reason: input.reason,
            newData: {
              disputeWindowId: disputeWindow.id,
              status: disputeWindow.status,
            },
          },
        });

        return { type: "ok" as const, disputeWindow };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 10000,
      },
    ),
  );
}

export async function creditPrizeDistribution(input: { distributionId: string; now?: Date }) {
  const now = input.now ?? new Date();

  return withSerializableRetry(() =>
    prisma.$transaction(
      async (tx) => {
        const distribution = await tx.prizeDistribution.findUnique({
          where: { id: input.distributionId },
        });
        if (!distribution) return { type: "not-found" as const };
        if (distribution.status === PrizeDistributionStatus.CREDITED) {
          return { type: "already-credited" as const, distribution };
        }

        const existingLedger = await tx.ledgerEntry.findUnique({
          where: { idempotencyKey: distribution.idempotencyKey },
          include: { wallet: true },
        });
        if (existingLedger) {
          const updatedDistribution = await tx.prizeDistribution.update({
            where: { id: distribution.id },
            data: {
              status: PrizeDistributionStatus.CREDITED,
              paidAt: distribution.paidAt ?? now,
              creditedAt: distribution.creditedAt ?? now,
            },
          });
          return {
            type: "idempotent" as const,
            distribution: updatedDistribution,
            ledger: existingLedger,
          };
        }

        const wallet = await tx.wallet.upsert({
          where: { userId: distribution.userId },
          update: {},
          create: { userId: distribution.userId, balanceXaf: 0, currency: "XAF" },
        });
        if (wallet.isFrozen) return { type: "wallet-frozen" as const, distribution };

        const nextBalanceXaf = wallet.balanceXaf + distribution.amountXaf;
        const ledger = await tx.ledgerEntry.create({
          data: {
            walletId: wallet.id,
            userId: distribution.userId,
            amountXaf: distribution.amountXaf,
            balanceAfterXaf: nextBalanceXaf,
            direction: LedgerDirection.CREDIT,
            type: LedgerType.PRIZE,
            description: "Prize credit from finalized session",
            referenceType: "PrizeDistribution",
            referenceId: distribution.id,
            idempotencyKey: distribution.idempotencyKey,
            sessionId: distribution.sessionId,
          },
        });

        const updatedWallet = await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balanceXaf: nextBalanceXaf,
            version: { increment: 1 },
          },
        });

        const updatedDistribution = await tx.prizeDistribution.update({
          where: { id: distribution.id },
          data: {
            status: PrizeDistributionStatus.CREDITED,
            paidAt: now,
            creditedAt: now,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: distribution.userId,
            action: "wallet.prize-credited",
            entity: "PrizeDistribution",
            entityId: distribution.id,
            oldData: serializeWalletSnapshot(wallet),
            newData: {
              wallet: serializeWalletSnapshot(updatedWallet),
              ledgerId: ledger.id,
              amountXaf: distribution.amountXaf,
            },
          },
        });

        return { type: "ok" as const, distribution: updatedDistribution, ledger };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 10000,
      },
    ),
  );
}
