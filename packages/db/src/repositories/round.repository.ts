import type { Round } from "@prisma/client";
import { prisma } from "../prisma.js";
import type { CreateRoundData } from "./types.js";

export function createRound(data: CreateRoundData): Promise<Round> {
  return prisma.round.create({
    data: {
      partyId: data.partyId,
      number: data.number,
      minigame: data.minigame,
      status: "SETUP",
    },
  });
}

export function findRoundById(id: string): Promise<Round | null> {
  return prisma.round.findUnique({ where: { id } });
}

export function listRoundsByParty(partyId: string): Promise<Round[]> {
  return prisma.round.findMany({
    where: { partyId },
    orderBy: { number: "asc" },
  });
}

export function updateRoundStatus(id: string, status: string): Promise<Round> {
  return prisma.round.update({ where: { id }, data: { status } });
}

export function updateRound(
  id: string,
  data: Partial<Pick<Round, "status" | "startedAt" | "deadline">>,
): Promise<Round> {
  return prisma.round.update({ where: { id }, data });
}

export function createRoundParticipant(roundId: string, participationId: string): Promise<unknown> {
  return prisma.roundParticipant.create({
    data: { roundId, participationId },
  });
}

export function listRoundParticipants(roundId: string): Promise<unknown[]> {
  return prisma.roundParticipant.findMany({ where: { roundId } });
}
