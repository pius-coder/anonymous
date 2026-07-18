import {
  LedgerDirection,
  LedgerType,
  PaymentInternalStatus,
  PaymentStatus,
  Prisma,
  ProviderServiceKind,
} from "@prisma/client";
import type {
  ProvisionalScore,
  PublishedScore,
  ScoreReview,
  LedgerEntry,
  ScoreEvidence,
} from "@prisma/client";
import { prisma } from "../prisma.js";
import type { CreateProvisionalScoreData, CreateScoreReviewData } from "./types.js";

export function createProvisionalScore(data: CreateProvisionalScoreData): Promise<ProvisionalScore> {
  return prisma.provisionalScore.create({
    data: {
      roundId: data.roundId,
      participationId: data.participationId,
      score: data.score ?? 0,
      status: data.status ?? "PENDING",
      evidence: (data.evidence ?? undefined) as Prisma.InputJsonValue | undefined,
      evidenceHash: data.evidenceHash,
    },
  });
}

export function findProvisionalScore(id: string): Promise<ProvisionalScore | null> {
  return prisma.provisionalScore.findUnique({ where: { id } });
}

export function findProvisionalScoreByRound(roundId: string, participationId: string): Promise<ProvisionalScore | null> {
  return prisma.provisionalScore.findUnique({
    where: { roundId_participationId: { roundId, participationId } },
  });
}

export function listProvisionalScoresByRound(roundId: string): Promise<ProvisionalScore[]> {
  return prisma.provisionalScore.findMany({ where: { roundId } });
}

export type UpdateProvisionalScoreData = {
  score?: number;
  status?: string;
  evidence?: Prisma.InputJsonValue;
  reviewedBy?: string;
  reviewedAt?: Date;
};

export function updateProvisionalScore(
  id: string,
  data: UpdateProvisionalScoreData,
): Promise<ProvisionalScore> {
  return prisma.provisionalScore.update({ where: { id }, data });
}

export function publishScore(
  provisionalScoreId: string,
  roundId: string,
  participationId: string,
  score: number,
  publishedBy: string,
  rank = 0,
): Promise<PublishedScore> {
  return prisma.publishedScore.create({
    data: {
      provisionalScoreId,
      roundId,
      participationId,
      score,
      rank,
      publishedBy,
    },
  });
}

export type PublishRoundScoreRow = {
  provisionalScoreId: string;
  participationId: string;
  score: number;
  rank: number;
  evidenceHash?: string | null;
};

export type PublishRoundScoresResult = {
  alreadyPublished: boolean;
  published: PublishedScore[];
};

/**
 * Atomically freeze a published projection for a round.
 * Idempotent when published rows already exist for the round.
 * Concurrent callers get a deterministic outcome via unique constraints + re-read.
 */
export async function publishRoundScores(input: {
  roundId: string;
  publishedBy: string;
  rows: PublishRoundScoreRow[];
  provisionalStatus?: string;
}): Promise<PublishRoundScoresResult> {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const existing = await tx.publishedScore.findMany({
          where: { roundId: input.roundId },
          orderBy: { rank: "asc" },
        });
        if (existing.length > 0) {
          return { alreadyPublished: true, published: existing };
        }

        const published: PublishedScore[] = [];
        for (const row of input.rows) {
          const created = await tx.publishedScore.create({
            data: {
              provisionalScoreId: row.provisionalScoreId,
              roundId: input.roundId,
              participationId: row.participationId,
              score: row.score,
              rank: row.rank,
              publishedBy: input.publishedBy,
              evidenceHash: row.evidenceHash ?? undefined,
            },
          });
          published.push(created);

          await tx.provisionalScore.update({
            where: { id: row.provisionalScoreId },
            data: {
              status: input.provisionalStatus ?? "PUBLISHED",
              reviewedBy: input.publishedBy,
              reviewedAt: new Date(),
              rank: row.rank,
            },
          });
        }

        return { alreadyPublished: false, published };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2002" || error.code === "P2034")
    ) {
      const published = await prisma.publishedScore.findMany({
        where: { roundId: input.roundId },
        orderBy: { rank: "asc" },
      });
      if (published.length > 0) {
        return { alreadyPublished: true, published };
      }
    }
    throw error;
  }
}

export function findPublishedScoreByRound(roundId: string, participationId: string): Promise<PublishedScore | null> {
  return prisma.publishedScore.findFirst({
    where: { roundId, participationId },
  });
}

export function listPublishedScoresByRound(roundId: string): Promise<PublishedScore[]> {
  return prisma.publishedScore.findMany({ where: { roundId } });
}

export type ScoreVerificationRow = ProvisionalScore & {
  scoreEvidence: ScoreEvidence | null;
  reviews: ScoreReview[];
  published: PublishedScore | null;
  participation: {
    id: string;
    userId: string;
    paymentState: string;
    admissionState: string;
    paymentTransactionId: string | null;
    user: {
      id: string;
      name: string | null;
      email: string;
    };
  };
};

export function listScoreVerificationRowsByRound(roundId: string): Promise<ScoreVerificationRow[]> {
  return prisma.provisionalScore.findMany({
    where: { roundId },
    include: {
      scoreEvidence: true,
      reviews: {
        orderBy: { createdAt: "asc" },
      },
      published: true,
      participation: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: [{ score: "desc" }, { participationId: "asc" }],
  });
}

export function listPrizeLedgerEntriesByRound(roundId: string) {
  return prisma.ledgerEntry.findMany({
    where: {
      ledgerType: LedgerType.PRIZE,
      idempotencyKey: {
        startsWith: `prize:${roundId}:`,
      },
    },
    include: {
      transaction: true,
      wallet: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

export function createScoreReview(data: CreateScoreReviewData): Promise<ScoreReview> {
  return prisma.scoreReview.create({
    data: {
      provisionalScoreId: data.provisionalScoreId,
      reviewedBy: data.reviewedBy,
      action: data.action,
      reason: data.reason,
      previousScore: data.previousScore,
      newScore: data.newScore,
    },
  });
}

export function listScoreReviewsByProvisional(provisionalScoreId: string): Promise<ScoreReview[]> {
  return prisma.scoreReview.findMany({
    where: { provisionalScoreId },
    orderBy: { createdAt: "asc" },
  });
}

export type CreateScoreReviewAndUpdateProvisionalData = CreateScoreReviewData & {
  provisionalStatus?: string;
  /** Optimistic concurrency token (ProvisionalScore.updatedAt). */
  expectedUpdatedAt?: Date;
};

/**
 * Persist a ScoreReview and optionally mirror review fields onto ProvisionalScore.
 * Domain rules stay outside this package; this is a durable write unit only.
 */
export async function createScoreReviewAndUpdateProvisional(
  data: CreateScoreReviewAndUpdateProvisionalData,
): Promise<{ review: ScoreReview; provisional: ProvisionalScore }> {
  return prisma.$transaction(async (tx) => {
    const provisional = await tx.provisionalScore.findUnique({
      where: { id: data.provisionalScoreId },
    });
    if (!provisional) {
      throw new Error("PROVISIONAL_SCORE_NOT_FOUND");
    }

    if (provisional.status === "PUBLISHED") {
      throw new Error("PROVISIONAL_SCORE_ALREADY_PUBLISHED");
    }

    if (
      data.expectedUpdatedAt &&
      provisional.updatedAt.getTime() !== data.expectedUpdatedAt.getTime()
    ) {
      throw new Error("PROVISIONAL_SCORE_VERSION_CONFLICT");
    }

    const review = await tx.scoreReview.create({
      data: {
        provisionalScoreId: data.provisionalScoreId,
        reviewedBy: data.reviewedBy,
        action: data.action,
        reason: data.reason,
        previousScore: data.previousScore ?? provisional.score,
        newScore: data.newScore,
      },
    });

    const updated = await tx.provisionalScore.update({
      where: { id: data.provisionalScoreId },
      data: {
        reviewedBy: data.reviewedBy,
        reviewedAt: new Date(),
        ...(data.provisionalStatus !== undefined ? { status: data.provisionalStatus } : {}),
        ...(data.newScore !== undefined ? { score: data.newScore } : {}),
      },
    });

    return { review, provisional: updated };
  });
}

export type PublishRoundWithGainsRow = PublishRoundScoreRow & {
  /** Optional prize credit for this participation's wallet. */
  prizeAmount?: number;
  walletId?: string;
  userId?: string;
};

export type PublishRoundWithGainsResult = PublishRoundScoresResult & {
  gains: LedgerEntry[];
  auditLogId: string | null;
};

/**
 * Atomically publish scores, post prize gains (idempotent), and write audit.
 * Compensable later via createCompensationLedgerEntry if needed.
 */
export async function publishRoundScoresWithGainsAndAudit(input: {
  roundId: string;
  publishedBy: string;
  rows: PublishRoundWithGainsRow[];
  provisionalStatus?: string;
  correlationId?: string;
  _attempt?: number;
}): Promise<PublishRoundWithGainsResult> {
  const attempt = input._attempt ?? 0;
  try {
    return await prisma.$transaction(
      async (tx) => {
        const existing = await tx.publishedScore.findMany({
          where: { roundId: input.roundId },
          orderBy: { rank: "asc" },
        });
        if (existing.length > 0) {
          const audit = await tx.auditLog.findFirst({
            where: {
              entity: "Round",
              entityId: input.roundId,
              action: "SCORES_PUBLISHED",
            },
            orderBy: { createdAt: "desc" },
          });
          return {
            alreadyPublished: true,
            published: existing,
            gains: [],
            auditLogId: audit?.id ?? null,
          };
        }

        const published: PublishedScore[] = [];
        const gains: LedgerEntry[] = [];

        for (const row of input.rows) {
          const created = await tx.publishedScore.create({
            data: {
              provisionalScoreId: row.provisionalScoreId,
              roundId: input.roundId,
              participationId: row.participationId,
              score: row.score,
              rank: row.rank,
              publishedBy: input.publishedBy,
              evidenceHash: row.evidenceHash ?? undefined,
            },
          });
          published.push(created);

          await tx.provisionalScore.update({
            where: { id: row.provisionalScoreId },
            data: {
              status: input.provisionalStatus ?? "PUBLISHED",
              reviewedBy: input.publishedBy,
              reviewedAt: new Date(),
              rank: row.rank,
            },
          });

          if (row.prizeAmount && row.prizeAmount > 0 && row.walletId) {
            const prizeKey = `prize:${input.roundId}:${row.participationId}`;
            const existingTx = await tx.paymentTransaction.findUnique({
              where: { idempotencyKey: prizeKey },
              include: { ledgerEntry: true },
            });
            if (existingTx?.ledgerEntry) {
              gains.push(existingTx.ledgerEntry);
            } else {
              const payment = await tx.paymentTransaction.create({
                data: {
                  walletId: row.walletId,
                  userId: row.userId,
                  amount: row.prizeAmount,
                  type: "PRIZE",
                  provider: "SYSTEM",
                  idempotencyKey: prizeKey,
                  status: PaymentStatus.SUCCESSFUL,
                  internalStatus: PaymentInternalStatus.SUCCEEDED,
                  serviceKind: ProviderServiceKind.PAYOUT,
                  settledAt: new Date(),
                },
              });
              const wallet = await tx.wallet.update({
                where: { id: row.walletId },
                data: {
                  balance: { increment: row.prizeAmount },
                  version: { increment: 1 },
                },
              });
              const ledger = await tx.ledgerEntry.create({
                data: {
                  transactionId: payment.id,
                  walletId: row.walletId,
                  debit: 0,
                  credit: row.prizeAmount,
                  balance: wallet.balance,
                  balanceAfter: wallet.balance,
                  reason: `Prize round ${input.roundId}`,
                  idempotencyKey: prizeKey,
                  direction: LedgerDirection.CREDIT,
                  ledgerType: LedgerType.PRIZE,
                },
              });
              gains.push(ledger);
            }
          }
        }

        const audit = await tx.auditLog.create({
          data: {
            userId: input.publishedBy,
            action: "SCORES_PUBLISHED",
            entity: "Round",
            entityId: input.roundId,
            result: "SUCCESS",
            correlationId: input.correlationId,
            reason: "Atomic score publication with gains",
            metadata: {
              publishedCount: published.length,
              gainsCount: gains.length,
            },
          },
        });

        return {
          alreadyPublished: false,
          published,
          gains,
          auditLogId: audit.id,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isConflict =
      (error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2002" || error.code === "P2034")) ||
      /could not serialize|40001/i.test(message);
    if (isConflict) {
      const published = await prisma.publishedScore.findMany({
        where: { roundId: input.roundId },
        orderBy: { rank: "asc" },
      });
      if (published.length > 0) {
        const audit = await prisma.auditLog.findFirst({
          where: {
            entity: "Round",
            entityId: input.roundId,
            action: "SCORES_PUBLISHED",
          },
          orderBy: { createdAt: "desc" },
        });
        return {
          alreadyPublished: true,
          published,
          gains: [],
          auditLogId: audit?.id ?? null,
        };
      }
      if (attempt < 12) {
        return publishRoundScoresWithGainsAndAudit({ ...input, _attempt: attempt + 1 });
      }
    }
    throw error;
  }
}
