import {
  DeliveryStatus,
  GameSessionStatus,
  NotificationChannel,
  NotificationJobStatus,
  prisma,
} from "@session-jeu/db";

export type NotificationSendJobData = {
  notificationJobId?: string;
  sessionId?: string;
  type?: string;
  scheduledFor?: string;
};

export async function processNotificationSend(data: NotificationSendJobData, now = new Date()) {
  if (!data.notificationJobId) {
    throw new Error("notificationJobId is required");
  }

  const job = await prisma.notificationJob.findUnique({
    where: { id: data.notificationJobId },
  });
  if (!job) return { sent: false, reason: "notification-not-found" };
  if (job.status === NotificationJobStatus.CANCELLED) {
    return { sent: false, reason: "notification-cancelled" };
  }

  if (job.sessionId) {
    const session = await prisma.gameSession.findUnique({
      where: { id: job.sessionId },
      select: { status: true },
    });
    if (session?.status === GameSessionStatus.CANCELLED) {
      await prisma.notificationJob.update({
        where: { id: job.id },
        data: { status: NotificationJobStatus.CANCELLED },
      });
      return { sent: false, reason: "session-cancelled" };
    }
  }

  if (job.channel === NotificationChannel.WHATSAPP) {
    const preference = job.userId
      ? await prisma.notificationPreference.findUnique({ where: { userId: job.userId } })
      : null;

    if (!preference?.whatsappOptIn || !preference.whatsappPhone) {
      await prisma.$transaction([
        prisma.notificationJob.update({
          where: { id: job.id },
          data: { status: NotificationJobStatus.SKIPPED, sentAt: now },
        }),
        prisma.deliveryLog.create({
          data: {
            notificationJobId: job.id,
            userId: job.userId,
            channel: NotificationChannel.WHATSAPP,
            status: DeliveryStatus.SKIPPED,
            errorCode: "403_OPT_IN_REQUIRED",
            errorMessage: "WhatsApp opt-in is required",
          },
        }),
      ]);
      return { sent: false, reason: "opt-in-required" };
    }

    await prisma.$transaction([
      prisma.notificationJob.update({
        where: { id: job.id },
        data: {
          status: NotificationJobStatus.FAILED,
          failedAt: now,
          error: "whatsapp-unavailable",
        },
      }),
      prisma.deliveryLog.create({
        data: {
          notificationJobId: job.id,
          userId: job.userId,
          channel: NotificationChannel.WHATSAPP,
          status: DeliveryStatus.FAILED,
          provider: "whatsapp",
          errorCode: "502_WHATSAPP_UNAVAILABLE",
          errorMessage: "WhatsApp gateway is optional and unavailable",
        },
      }),
    ]);
    return { sent: false, reason: "whatsapp-unavailable" };
  }

  await prisma.$transaction([
    prisma.notificationJob.update({
      where: { id: job.id },
      data: { status: NotificationJobStatus.SENT, sentAt: now },
    }),
    prisma.deliveryLog.create({
      data: {
        notificationJobId: job.id,
        userId: job.userId,
        channel: NotificationChannel.IN_APP,
        status: DeliveryStatus.SENT,
      },
    }),
  ]);

  return { sent: true, notificationJobId: job.id };
}
