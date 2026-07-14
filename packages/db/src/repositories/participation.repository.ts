import { prisma } from "../prisma.js";
import type { PartyParticipation, CreateParticipationData } from "./types.js";

export function createParticipation(data: CreateParticipationData): Promise<PartyParticipation> {
  return prisma.partyParticipation.create({
    data: {
      partyId: data.partyId,
      userId: data.userId,
      role: data.role ?? "player",
      status: "INVITED",
    },
  });
}

export function findParticipationById(id: string): Promise<PartyParticipation | null> {
  return prisma.partyParticipation.findUnique({ where: { id } });
}

export function findParticipation(partyId: string, userId: string): Promise<PartyParticipation | null> {
  return prisma.partyParticipation.findUnique({
    where: { partyId_userId: { partyId, userId } },
  });
}

export function listParticipationsByParty(partyId: string): Promise<PartyParticipation[]> {
  return prisma.partyParticipation.findMany({
    where: { partyId },
    orderBy: { createdAt: "asc" },
  });
}

export function listParticipationsByUser(userId: string): Promise<PartyParticipation[]> {
  return prisma.partyParticipation.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export function updateParticipationStatus(id: string, status: string): Promise<PartyParticipation> {
  return prisma.partyParticipation.update({ where: { id }, data: { status } });
}

export function updateParticipation(
  id: string,
  data: Partial<Pick<PartyParticipation, "status" | "readinessState" | "connectionState" | "role">>,
): Promise<PartyParticipation> {
  return prisma.partyParticipation.update({ where: { id }, data });
}

export function deleteParticipation(id: string): Promise<PartyParticipation> {
  return prisma.partyParticipation.delete({ where: { id } });
}
