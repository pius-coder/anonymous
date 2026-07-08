import { prisma, SessionRegistrationStatus } from "@session-jeu/db";

export type CheckInDeadlineJobData = {
  sessionId?: string;
  checkInDeadlineAt?: string;
};

export async function processCheckInDeadline(data: CheckInDeadlineJobData, now = new Date()) {
  if (!data.sessionId) {
    throw new Error("sessionId is required");
  }
  if (!data.checkInDeadlineAt) {
    throw new Error("checkInDeadlineAt is required");
  }

  const checkInDeadlineAt = new Date(data.checkInDeadlineAt);
  if (checkInDeadlineAt > now) {
    return { processed: false, reason: "deadline-not-reached" };
  }

  const paidRegistrations = await prisma.sessionRegistration.findMany({
    where: {
      sessionId: data.sessionId,
      status: SessionRegistrationStatus.PAID,
    },
  });

  if (paidRegistrations.length === 0) {
    return { processed: true, noShowCount: 0 };
  }

  const updated = await prisma.sessionRegistration.updateMany({
    where: {
      sessionId: data.sessionId,
      status: SessionRegistrationStatus.PAID,
    },
    data: {
      status: SessionRegistrationStatus.NO_SHOW,
      noShowAt: now,
      cancellationReason: "check-in-deadline-missed",
    },
  });

  await Promise.all(
    paidRegistrations.map((registration) =>
      prisma.auditLog.create({
        data: {
          userId: registration.userId,
          action: "checkin.deadline-reached",
          entity: "SessionRegistration",
          entityId: registration.id,
          oldData: {
            status: registration.status,
          },
          newData: {
            status: SessionRegistrationStatus.NO_SHOW,
            noShowAt: now.toISOString(),
          },
        },
      }),
    ),
  );

  return { processed: true, noShowCount: updated.count };
}
