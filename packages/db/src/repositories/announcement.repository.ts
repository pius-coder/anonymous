import type { Announcement } from "@prisma/client";
import { prisma } from "../prisma.js";
import type { CreateAnnouncementData } from "./types.js";

export function createAnnouncement(data: CreateAnnouncementData): Promise<Announcement> {
  return prisma.announcement.create({
    data: {
      partyId: data.partyId ?? null,
      title: data.title,
      body: data.body,
      createdBy: data.createdBy,
    },
  });
}

export function findAnnouncementsByParty(partyId: string): Promise<Announcement[]> {
  return prisma.announcement.findMany({
    where: { partyId },
    orderBy: { createdAt: "desc" },
  });
}

export function deleteAnnouncement(id: string): Promise<Announcement> {
  return prisma.announcement.delete({ where: { id } });
}

export function findAnnouncementById(id: string): Promise<Announcement | null> {
  return prisma.announcement.findUnique({ where: { id } });
}
