import { Prisma } from "@prisma/client";
import type { Party } from "@prisma/client";
import { prisma } from "../prisma.js";
import type { CreatePartyData } from "./types.js";

export function createParty(data: CreatePartyData): Promise<Party> {
  return prisma.party.create({
    data: {
      code: data.code,
      name: data.name,
      status: "DRAFT",
      visibility: data.visibility ?? "public",
      minPlayers: data.minPlayers,
      maxPlayers: data.maxPlayers,
      roundProgram: (data.roundProgram ?? undefined) as Prisma.InputJsonValue | undefined,
      scheduledAt: data.scheduledAt,
    },
  });
}

export function findPartyById(id: string): Promise<Party | null> {
  return prisma.party.findUnique({ where: { id } });
}

export function findPartyByCode(code: string): Promise<Party | null> {
  return prisma.party.findUnique({ where: { code } });
}

export function listParties(skip = 0, take = 50): Promise<Party[]> {
  return prisma.party.findMany({ skip, take, orderBy: { createdAt: "desc" } });
}

export function updatePartyStatus(id: string, status: string): Promise<Party> {
  return prisma.party.update({ where: { id }, data: { status } });
}

export type UpdatePartyData = {
  name?: string;
  status?: string;
  visibility?: string;
  minPlayers?: number;
  maxPlayers?: number;
  roundProgram?: unknown;
  scheduledAt?: Date;
};

export function updateParty(
  id: string,
  data: UpdatePartyData,
): Promise<Party> {
  const { roundProgram, ...rest } = data;
  return prisma.party.update({
    where: { id },
    data: {
      ...rest,
      roundProgram: (roundProgram ?? undefined) as Prisma.InputJsonValue,
    },
  });
}

export function deleteParty(id: string): Promise<Party> {
  return prisma.party.delete({ where: { id } });
}

export function findPublicParties(skip = 0, take = 50): Promise<Party[]> {
  return prisma.party.findMany({
    where: {
      status: { in: ["SCHEDULED", "PREPARATION_OPEN"] },
      visibility: "public",
    },
    skip,
    take,
    orderBy: { scheduledAt: "asc" },
  });
}

export function countPublicParties(): Promise<number> {
  return prisma.party.count({
    where: {
      status: { in: ["SCHEDULED", "PREPARATION_OPEN"] },
      visibility: "public",
    },
  });
}
