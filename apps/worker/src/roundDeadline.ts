import { LivePhase, prisma, RoundStatus } from "@session-jeu/db";
import { publishRoundResolved } from "./redisNotify.js";

export type RoundDeadlineJobData = {
  sessionId: string;
  roundId: string;
  deadlineAt: string;
};

const API_BASE_URL = process.env.INTERNAL_API_URL || "http://localhost:3001";
const API_KEY = process.env.INTERNAL_API_KEY || "";

async function callFinalizeRound(roundId: string) {
  const url = `${API_BASE_URL}/internal/rounds/${roundId}/finalize`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(API_KEY ? { "x-internal-api-key": API_KEY } : {}),
    },
    body: "{}",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API finalize failed: ${res.status} ${body}`);
  }
  return res.json() as Promise<{
    status: string;
    resolutionLogId: string;
    outputHash: string;
    output?: {
      scores: Record<string, number>;
      ranks: Record<string, number>;
      qualifiedIds: string[];
      eliminatedIds: string[];
      tieGroups: string[][];
    };
  }>;
}

export async function processRoundDeadline(data: RoundDeadlineJobData, now = new Date()) {
  if (!data.sessionId || !data.roundId || !data.deadlineAt) {
    throw new Error("Invalid round deadline job data");
  }

  const deadlineAt = new Date(data.deadlineAt);
  if (Number.isNaN(deadlineAt.getTime())) {
    throw new Error("Invalid round deadline timestamp");
  }
  if (deadlineAt > now) {
    return { processed: false, reason: "deadline-not-reached" as const };
  }

  const deadline = await prisma.roundDeadline.findUnique({
    where: { roundId: data.roundId },
    include: { round: true },
  });

  if (!deadline || deadline.closedAt) {
    return { processed: false, reason: "already-closed" as const };
  }

  const [, updatedRound] = await prisma.$transaction([
    prisma.roundDeadline.update({
      where: { id: deadline.id },
      data: { closedAt: now },
    }),
    prisma.roundInstance.update({
      where: { id: data.roundId },
      data: {
        status: RoundStatus.COMPLETED,
        endTime: now,
      },
    }),
    prisma.liveSessionState.updateMany({
      where: {
        sessionId: data.sessionId,
        currentRoundId: data.roundId,
      },
      data: {
        phase: LivePhase.RESOLVING,
        phaseStartedAt: now,
      },
    }),
    prisma.auditLog.create({
      data: {
        action: "round.deadline-closed",
        entity: "RoundInstance",
        entityId: data.roundId,
        newData: {
          sessionId: data.sessionId,
          deadlineAt: deadline.deadlineAt.toISOString(),
          closedAt: now.toISOString(),
        },
      },
    }),
  ]);

  try {
    const finalized = await callFinalizeRound(data.roundId);
    if (finalized.output) {
      await publishRoundResolved({
        sessionId: data.sessionId,
        roundId: data.roundId,
        ...finalized.output,
      });
    }
    return {
      processed: true,
      roundId: updatedRound.id,
      status: updatedRound.status,
      finalized: finalized.status,
      resolutionLogId: finalized.resolutionLogId,
    };
  } catch (error) {
    console.error(`Finalization failed for round ${data.roundId}:`, error);
    return {
      processed: true,
      roundId: updatedRound.id,
      status: updatedRound.status,
      finalized: "errored",
    };
  }
}
