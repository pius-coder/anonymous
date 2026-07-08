import { prisma, SessionRegistrationStatus } from "@session-jeu/db";

export type RegistrationExpirationJobData = {
  registrationId?: string;
  paymentDeadlineAt?: string;
};

export async function processRegistrationExpiration(
  data: RegistrationExpirationJobData,
  now = new Date(),
) {
  if (!data.registrationId) {
    throw new Error("registrationId is required");
  }

  const registration = await prisma.sessionRegistration.findUnique({
    where: { id: data.registrationId },
  });

  if (!registration || registration.status !== SessionRegistrationStatus.PAYMENT_PENDING) {
    return { expired: false, reason: "not-pending" };
  }

  if (!registration.paymentDeadlineAt || registration.paymentDeadlineAt > now) {
    return { expired: false, reason: "deadline-not-reached" };
  }

  const updated = await prisma.sessionRegistration.updateMany({
    where: {
      id: registration.id,
      status: SessionRegistrationStatus.PAYMENT_PENDING,
    },
    data: {
      status: SessionRegistrationStatus.EXPIRED,
      cancelledAt: now,
      cancellationReason: "payment-deadline-expired",
    },
  });

  if (updated.count !== 1) {
    return { expired: false, reason: "concurrent-update" };
  }

  await prisma.auditLog.create({
    data: {
      userId: registration.userId,
      action: "registration.expired",
      entity: "SessionRegistration",
      entityId: registration.id,
      oldData: {
        status: registration.status,
        paymentDeadlineAt: registration.paymentDeadlineAt.toISOString(),
      },
      newData: {
        status: SessionRegistrationStatus.EXPIRED,
        cancelledAt: now.toISOString(),
      },
    },
  });

  return { expired: true, registrationId: registration.id };
}
