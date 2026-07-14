import { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import type { ProvisionalScore, PublishedScore, CreateProvisionalScoreData } from "./types.js";

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
