import { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import type { Announcement, NotificationJob, CreateAnnouncementData, CreateNotificationJobData } from "./types.js";

export function createAnnouncement(data: CreateAnnouncementData): Promise<Announcement> {
  return prisma.announcement.create({
    data: {
      partyId: data.partyId,
      title: data.title,
      body: data.body,
      createdBy: data.createdBy,
    },
  });
}

export function listAnnouncementsByParty(partyId: string): Promise<Announcement[]> {
  return prisma.announcement.findMany({
    where: { partyId },
    orderBy: { createdAt: "desc" },
  });
}

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

export function listPendingNotificationJobs(): Promise<NotificationJob[]> {
  return prisma.notificationJob.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
  });
}

export function updateNotificationJobStatus(id: string, status: string): Promise<NotificationJob> {
  return prisma.notificationJob.update({ where: { id }, data: { status } });
}
