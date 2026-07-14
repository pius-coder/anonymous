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
  roundProgram?: Prisma.InputJsonValue;
  scheduledAt?: Date;
};

export function updateParty(
  id: string,
  data: UpdatePartyData,
): Promise<Party> {
  return prisma.party.update({ where: { id }, data });
}

export function deleteParty(id: string): Promise<Party> {
  return prisma.party.delete({ where: { id } });
}
