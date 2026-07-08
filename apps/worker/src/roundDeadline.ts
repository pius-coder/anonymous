import { LivePhase, prisma, RoundStatus } from "@session-jeu/db";

export type RoundDeadlineJobData = {
  sessionId: string;
  roundId: string;
  deadlineAt: string;
};

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

  return {
    processed: true,
    roundId: updatedRound.id,
    status: updatedRound.status,
  };
}
