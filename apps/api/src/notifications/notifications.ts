import { randomBytes } from "node:crypto";
import { z } from "zod";
import {
  DeliveryStatus,
  GameSessionStatus,
  NotificationChannel,
  NotificationJobStatus,
  NotificationType,
  Prisma,
  SessionVisibility,
  prisma,
} from "@session-jeu/db";

export const notificationPreferencesPatchSchema = z.object({
  inAppEnabled: z.boolean().optional(),
  whatsappOptIn: z.boolean().optional(),
  whatsappPhone: z.string().trim().min(5).max(32).nullable().optional(),
  transactionalOptIn: z.boolean().optional(),
  marketingOptIn: z.boolean().optional(),
});

export const notificationsQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const adminShareParamsSchema = z.object({
  id: z.string().min(1),
});

export const sendNotificationSchema = z.object({
  notificationJobId: z.string().min(1),
});

export const whatsappWebhookSchema = z.record(z.string(), z.unknown());

export type QueueNotificationInput = {
  userId?: string;
  sessionId?: string;
  type: NotificationType | keyof typeof NotificationType | string;
  channel: NotificationChannel | keyof typeof NotificationChannel | string;
  title: string;
  body: string;
  idempotencyKey: string;
  scheduledFor?: Date;
  payload?: Record<string, unknown>;
};

function serializeDate(date: Date | null | undefined) {
  return date?.toISOString() ?? null;
}

function jsonObject(value: Record<string, unknown> | undefined) {
  return value === undefined ? undefined : (value as Prisma.InputJsonObject);
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function serializePreference(preference: {
  inAppEnabled: boolean;
  whatsappOptIn: boolean;
  whatsappPhone: string | null;
  transactionalOptIn: boolean;
  marketingOptIn: boolean;
  updatedAt: Date;
}) {
  return {
    inAppEnabled: preference.inAppEnabled,
    whatsappOptIn: preference.whatsappOptIn,
    whatsappPhone: preference.whatsappPhone,
    transactionalOptIn: preference.transactionalOptIn,
    marketingOptIn: preference.marketingOptIn,
    updatedAt: preference.updatedAt.toISOString(),
  };
}

export async function getNotificationPreference(userId: string) {
  const preference = await prisma.notificationPreference.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
  return serializePreference(preference);
}

export async function updateNotificationPreference(input: {
  userId: string;
  data: z.infer<typeof notificationPreferencesPatchSchema>;
}) {
  const existing = await prisma.notificationPreference.upsert({
    where: { userId: input.userId },
    update: {},
    create: { userId: input.userId },
  });

  const preference = await prisma.$transaction(async (tx) => {
    const updated = await tx.notificationPreference.update({
      where: { userId: input.userId },
      data: {
        ...(input.data.inAppEnabled !== undefined
          ? { inAppEnabled: input.data.inAppEnabled }
          : {}),
        ...(input.data.whatsappOptIn !== undefined
          ? { whatsappOptIn: input.data.whatsappOptIn }
          : {}),
        ...(input.data.whatsappPhone !== undefined
          ? { whatsappPhone: input.data.whatsappPhone }
          : {}),
        ...(input.data.transactionalOptIn !== undefined
          ? { transactionalOptIn: input.data.transactionalOptIn }
          : {}),
        ...(input.data.marketingOptIn !== undefined
          ? { marketingOptIn: input.data.marketingOptIn }
          : {}),
      },
    });

    if (
      input.data.whatsappOptIn !== undefined &&
      input.data.whatsappOptIn !== existing.whatsappOptIn
    ) {
      await tx.consentRecord.create({
        data: {
          userId: input.userId,
          channel: NotificationChannel.WHATSAPP,
          optedIn: input.data.whatsappOptIn,
          source: "profile-preferences",
          reason: input.data.whatsappOptIn ? "whatsapp-opt-in" : "whatsapp-opt-out",
          revokedAt: input.data.whatsappOptIn ? null : new Date(),
        },
      });
    }

    return updated;
  });

  return serializePreference(preference);
}

export async function listInAppNotifications(input: {
  userId: string;
  cursor?: string;
  limit: number;
}) {
  const rows = await prisma.notificationJob.findMany({
    where: {
      userId: input.userId,
      channel: NotificationChannel.IN_APP,
      status: { not: NotificationJobStatus.CANCELLED },
    },
    take: input.limit + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  const entries = rows.slice(0, input.limit);
  return {
    entries: entries.map((entry) => ({
      id: entry.id,
      type: entry.type,
      status: entry.status,
      title: entry.title,
      body: entry.body,
      payload: entry.payload,
      createdAt: entry.createdAt.toISOString(),
      sentAt: serializeDate(entry.sentAt),
    })),
    nextCursor: rows.length > input.limit ? rows[input.limit]?.id ?? null : null,
  };
}

export async function queueNotification(input: QueueNotificationInput) {
  try {
    const job = await prisma.notificationJob.create({
      data: {
        userId: input.userId,
        sessionId: input.sessionId,
        type: input.type as NotificationType,
        channel: input.channel as NotificationChannel,
        title: input.title,
        body: input.body,
        payload: jsonObject(input.payload),
        idempotencyKey: input.idempotencyKey,
        scheduledFor: input.scheduledFor,
      },
    });
    return { type: "queued" as const, job };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { type: "duplicate" as const };
    }
    throw error;
  }
}

export async function queueNotificationSafely(input: QueueNotificationInput) {
  try {
    return await queueNotification(input);
  } catch (error) {
    return {
      type: "failed" as const,
      error: error instanceof Error ? error.message : "unknown notification error",
    };
  }
}

export function notificationReminderJobId(input: { sessionId: string; type: string }) {
  return `notification.reminder.${input.sessionId}.${input.type}`.replace(/:/g, "_");
}

export async function processNotificationSend(input: { notificationJobId: string; now?: Date }) {
  const now = input.now ?? new Date();
  const job = await prisma.notificationJob.findUnique({ where: { id: input.notificationJobId } });
  if (!job) return { type: "not-found" as const };
  if (job.status === NotificationJobStatus.CANCELLED) return { type: "skipped" as const };

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
      return { type: "cancelled-session" as const };
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
      return { type: "opt-in-required" as const };
    }

    await prisma.$transaction([
      prisma.notificationJob.update({
        where: { id: job.id },
        data: { status: NotificationJobStatus.FAILED, failedAt: now, error: "whatsapp-unavailable" },
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
    return { type: "whatsapp-unavailable" as const };
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
  return { type: "sent" as const };
}

export function buildSessionShareMessage(input: {
  name: string;
  code: string;
  startsAt: Date | null;
  shareUrl: string;
}) {
  const startsAt = input.startsAt ? ` Depart: ${input.startsAt.toISOString()}.` : "";
  return `Session Jeu: ${input.name} (${input.code}).${startsAt} Rejoindre: ${input.shareUrl}`;
}

export async function createSessionShareMessage(input: { sessionId: string; adminUserId: string }) {
  const session = await prisma.gameSession.findUnique({
    where: { id: input.sessionId },
    select: {
      id: true,
      code: true,
      name: true,
      visibility: true,
      status: true,
      startTime: true,
    },
  });
  if (!session) return { type: "not-found" as const };
  if (session.visibility === SessionVisibility.PRIVATE) return { type: "private" as const };

  const token = randomBytes(16).toString("base64url");
  const shareLink = await prisma.shareLink.create({
    data: {
      token,
      sessionId: session.id,
      createdBy: input.adminUserId,
    },
  });
  const baseUrl = process.env.PUBLIC_WEB_URL || "http://localhost:3000";
  const shareUrl = `${baseUrl}/v1/share/${shareLink.token}`;
  const message = buildSessionShareMessage({
    name: session.name,
    code: session.code,
    startsAt: session.startTime,
    shareUrl,
  });

  await prisma.auditLog.create({
    data: {
      userId: input.adminUserId,
      action: "share.link-created",
      entity: "ShareLink",
      entityId: shareLink.id,
      newData: { sessionId: session.id, visibility: session.visibility },
    },
  });

  return { type: "ok" as const, shareLink, message, shareUrl };
}

export async function recordWhatsappWebhook(payload: Record<string, unknown>) {
  const delivery = await prisma.deliveryLog.create({
    data: {
      channel: NotificationChannel.WHATSAPP,
      status: DeliveryStatus.DELIVERED,
      provider: "whatsapp",
      payload: payload as Prisma.InputJsonObject,
    },
  });
  await prisma.auditLog.create({
    data: {
      action: "whatsapp.webhook-received",
      entity: "DeliveryLog",
      entityId: delivery.id,
    },
  });
  return delivery;
}
