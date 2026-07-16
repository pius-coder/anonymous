import { Prisma } from "@prisma/client";
import type { DeliveryLog, NotificationJob } from "@prisma/client";
import { prisma } from "../prisma.js";
import type { CreateDeliveryLogData, CreateNotificationJobData } from "./types.js";

/**
 * Notification jobs and delivery logs only.
 * Announcements live in announcement.repository (do not duplicate here).
 */

export function createNotificationJob(data: CreateNotificationJobData): Promise<NotificationJob> {
  return prisma.notificationJob.create({
    data: {
      userId: data.userId,
      type: data.type,
      payload: data.payload as Prisma.InputJsonValue,
      status: data.status ?? "PENDING",
    },
  });
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
