import type { PairAssignment, TeamAssignment, TeamMember } from "@prisma/client";
import { prisma } from "../prisma.js";
import type { CreatePairAssignmentData, CreateTeamAssignmentData } from "./types.js";

export async function createTeamWithMembers(
  data: CreateTeamAssignmentData,
): Promise<TeamAssignment & { members: TeamMember[] }> {
  return prisma.$transaction(async (tx) => {
    const team = await tx.teamAssignment.create({
      data: {
        partyId: data.partyId,
        roundId: data.roundId,
        teamKey: data.teamKey,
        captainParticipationId: data.captainParticipationId,
      },
    });
    await tx.teamMember.createMany({
      data: data.memberParticipationIds.map((participationId, orderIndex) => ({
        teamId: team.id,
        participationId,
        orderIndex,
      })),
    });
    return tx.teamAssignment.findUniqueOrThrow({
      where: { id: team.id },
      include: { members: { orderBy: { orderIndex: "asc" } } },
    });
  });
}

export function listTeamsByParty(
  partyId: string,
  roundId?: string,
): Promise<(TeamAssignment & { members: TeamMember[] })[]> {
  return prisma.teamAssignment.findMany({
    where: {
      partyId,
      ...(roundId !== undefined ? { roundId } : {}),
    },
    include: { members: true },
    orderBy: { teamKey: "asc" },
  });
}

export function createPairAssignment(data: CreatePairAssignmentData): Promise<PairAssignment> {
  return prisma.pairAssignment.create({
    data: {
      partyId: data.partyId,
      roundId: data.roundId,
      pairKey: data.pairKey,
      participationAId: data.participationAId,
      participationBId: data.participationBId,
      unpaired: data.unpaired ?? !data.participationBId,
    },
  });
}

export function listPairsByRound(roundId: string): Promise<PairAssignment[]> {
  return prisma.pairAssignment.findMany({
    where: { roundId },
    orderBy: { pairKey: "asc" },
  });
}
