import { Prisma } from "@prisma/client";
import type { ProvisionalScore, PublishedScore, ScoreReview } from "@prisma/client";
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
): Promise<PublishedScore> {
  return prisma.publishedScore.create({
    data: {
      provisionalScoreId,
      roundId,
      participationId,
      score,
      rank: 0,
      publishedBy,
    },
  });
}

export function findPublishedScoreByRound(roundId: string, participationId: string): Promise<PublishedScore | null> {
  return prisma.publishedScore.findFirst({
    where: { roundId, participationId },
  });
}

export function listPublishedScoresByRound(roundId: string): Promise<PublishedScore[]> {
  return prisma.publishedScore.findMany({ where: { roundId } });
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
