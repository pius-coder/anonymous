import { Prisma } from "@prisma/client";
import type { DeliveryLog, NotificationJob } from "@prisma/client";
import { prisma } from "../prisma.js";
import type { CreateDeliveryLogData, CreateNotificationJobData } from "./types.js";
import { randomBytes } from "node:crypto";

/**
 * Notification jobs and delivery logs only.
 * Announcements live in announcement.repository (do not duplicate here).
 */

export async function createNotificationJob(
  data: CreateNotificationJobData,
): Promise<NotificationJob> {
  if (data.idempotencyKey) {
    const existing = await prisma.notificationJob.findUnique({
      where: { idempotencyKey: data.idempotencyKey },
    });
    if (existing) return existing;
  }

  try {
    return await prisma.notificationJob.create({
      data: {
        userId: data.userId,
        type: data.type,
        payload: data.payload as Prisma.InputJsonValue,
        status: data.status ?? "PENDING",
        idempotencyKey: data.idempotencyKey,
        availableAt: data.availableAt ?? new Date(),
        maxAttempts: data.maxAttempts ?? 5,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      data.idempotencyKey
    ) {
      const again = await prisma.notificationJob.findUnique({
        where: { idempotencyKey: data.idempotencyKey },
      });
      if (again) return again;
    }
    throw error;
  }
}

export function findNotificationJobById(id: string): Promise<NotificationJob | null> {
  return prisma.notificationJob.findUnique({ where: { id } });
}

export function listPendingNotificationJobs(): Promise<NotificationJob[]> {
  return prisma.notificationJob.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
  });
}

export function updateNotificationJobStatus(id: string, status: string): Promise<NotificationJob> {
  return prisma.notificationJob.update({
    where: { id },
    data: {
      status,
      ...(status === "SENT" ? { sentAt: new Date() } : {}),
    },
  });
}

/**
 * Claim one due job transactionally. Concurrent workers: only one wins.
 */
export async function claimNextNotificationJob(input: {
  workerId: string;
  now?: Date;
  _attempt?: number;
}): Promise<NotificationJob | null> {
  const now = input.now ?? new Date();
  const claimToken = randomBytes(16).toString("hex");
  const attempt = input._attempt ?? 0;

  try {
    return await prisma.$transaction(
      async (tx) => {
        const candidates = await tx.notificationJob.findMany({
          where: {
            status: "PENDING",
            availableAt: { lte: now },
            claimToken: null,
            attempts: { lt: 5 },
          },
          orderBy: { availableAt: "asc" },
          take: 1,
        });
        if (!candidates.length) return null;

        const job = candidates[0];
        const result = await tx.notificationJob.updateMany({
          where: {
            id: job.id,
            status: "PENDING",
            claimToken: null,
          },
          data: {
            status: "PROCESSING",
            claimToken,
            claimedAt: now,
            claimedBy: input.workerId,
            attempts: { increment: 1 },
          },
        });
        if (result.count !== 1) return null;

        return tx.notificationJob.findUnique({ where: { id: job.id } });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isSerialize =
      (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") ||
      /could not serialize|40001/i.test(message);
    if (isSerialize && attempt < 12) {
      return claimNextNotificationJob({ ...input, _attempt: attempt + 1 });
    }
    throw error;
  }
}

export async function completeNotificationJob(
  id: string,
  claimToken: string,
): Promise<NotificationJob | null> {
  const result = await prisma.notificationJob.updateMany({
    where: { id, claimToken, status: "PROCESSING" },
    data: {
      status: "SENT",
      sentAt: new Date(),
      claimToken: null,
    },
  });
  if (result.count !== 1) return null;
  return prisma.notificationJob.findUnique({ where: { id } });
}

export async function failNotificationJob(
  id: string,
  claimToken: string,
  opts?: { retryDelayMs?: number; final?: boolean },
): Promise<NotificationJob | null> {
  const job = await prisma.notificationJob.findUnique({ where: { id } });
  if (!job || job.claimToken !== claimToken) return null;

  const final = opts?.final || job.attempts >= job.maxAttempts;
  const delay = opts?.retryDelayMs ?? 30_000;

  return prisma.notificationJob.update({
    where: { id },
    data: {
      status: final ? "FAILED_FINAL" : "PENDING",
      claimToken: null,
      claimedAt: null,
      claimedBy: null,
      availableAt: final ? job.availableAt : new Date(Date.now() + delay),
    },
  });
}

export function createDeliveryLog(data: CreateDeliveryLogData): Promise<DeliveryLog> {
  return prisma.deliveryLog.create({
    data: {
      jobId: data.jobId,
      channel: data.channel,
      status: data.status,
      error: data.error,
      ...(data.deliveredAt !== undefined ? { deliveredAt: data.deliveredAt } : {}),
    },
  });
}

export function listDeliveryLogsByJob(jobId: string): Promise<DeliveryLog[]> {
  return prisma.deliveryLog.findMany({
    where: { jobId },
    orderBy: { deliveredAt: "asc" },
  });
}

export function listDeliveryLogsByStatus(status: string): Promise<DeliveryLog[]> {
  return prisma.deliveryLog.findMany({
    where: { status },
    orderBy: { deliveredAt: "desc" },
  });
}
