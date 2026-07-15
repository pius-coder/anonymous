import type { PlayerAction, Prisma, Round, RoundDeadline, RoundParticipant } from "@prisma/client";
import { prisma } from "../prisma.js";
import type {
  CreatePlayerActionData,
  CreateRoundData,
  UpdateRoundDeadlineData,
  UpdateRoundLifecycleData,
  UpsertRoundDeadlineData,
} from "./types.js";

export function createRound(data: CreateRoundData): Promise<Round> {
  return prisma.round.create({
    data: {
      partyId: data.partyId,
      number: data.number,
      minigame: data.minigame,
      status: data.status ?? "SETUP",
      deadline: data.deadline,
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

export function findRoundByPartyNumber(partyId: string, number: number): Promise<Round | null> {
  return prisma.round.findUnique({
    where: {
      partyId_number: {
        partyId,
        number,
      },
    },
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

export function updateRoundLifecycle(id: string, data: UpdateRoundLifecycleData): Promise<Round> {
  return prisma.round.update({ where: { id }, data });
}

export function createRoundParticipant(roundId: string, participationId: string, status = "PENDING"): Promise<RoundParticipant> {
  return prisma.roundParticipant.create({
    data: { roundId, participationId, status },
  });
}

export function listRoundParticipants(roundId: string): Promise<RoundParticipant[]> {
  return prisma.roundParticipant.findMany({ where: { roundId } });
}

export function upsertRoundParticipantStatus(
  roundId: string,
  participationId: string,
  status: string,
  finishedAt?: Date | null,
): Promise<RoundParticipant> {
  return prisma.roundParticipant.upsert({
    where: {
      roundId_participationId: {
        roundId,
        participationId,
      },
    },
    create: {
      roundId,
      participationId,
      status,
      finishedAt,
    },
    update: {
      status,
      finishedAt,
    },
  });
}

export function markRoundParticipantsWaitingReview(roundId: string): Promise<{ count: number }> {
  return prisma.roundParticipant.updateMany({
    where: {
      roundId,
      status: {
        in: ["PLAYING", "FINISHED_ROUND"],
      },
    },
    data: {
      status: "WAITING_REVIEW",
    },
  });
}

export function createOrUpdateRoundDeadline(data: UpsertRoundDeadlineData): Promise<RoundDeadline> {
  return prisma.roundDeadline.upsert({
    where: { roundId: data.roundId },
    create: data,
    update: {
      deadlineAt: data.deadlineAt,
      durationMs: data.durationMs,
      pausedAt: data.pausedAt,
      remainingMs: data.remainingMs,
      closedAt: data.closedAt,
    },
  });
}

export function updateRoundDeadline(roundId: string, data: UpdateRoundDeadlineData): Promise<RoundDeadline> {
  return prisma.roundDeadline.update({
    where: { roundId },
    data,
  });
}

export function findRoundDeadlineByRoundId(roundId: string): Promise<RoundDeadline | null> {
  return prisma.roundDeadline.findUnique({ where: { roundId } });
}

export function listDueRoundDeadlines(now = new Date()): Promise<Array<RoundDeadline & { round: Round }>> {
  return prisma.roundDeadline.findMany({
    where: {
      deadlineAt: {
        not: null,
        lte: now,
      },
      closedAt: null,
      round: {
        status: {
          in: ["ACTIVE"],
        },
      },
    },
    include: {
      round: true,
    },
  });
}

export async function claimDueRoundDeadline(roundId: string, now = new Date()): Promise<boolean> {
  const result = await prisma.roundDeadline.updateMany({
    where: {
      roundId,
      deadlineAt: {
        not: null,
        lte: now,
      },
      closedAt: null,
      round: {
        status: "ACTIVE",
      },
    },
    data: {
      closedAt: now,
    },
  });

  return result.count === 1;
}

export function findPlayerActionByNonce(
  roundId: string,
  participationId: string,
  actionNonce: string,
): Promise<PlayerAction | null> {
  return prisma.playerAction.findUnique({
    where: {
      roundId_participationId_actionNonce: {
        roundId,
        participationId,
        actionNonce,
      },
    },
  });
}

export function createPlayerAction(data: CreatePlayerActionData): Promise<PlayerAction> {
  return prisma.playerAction.create({
    data: {
      roundId: data.roundId,
      participationId: data.participationId,
      actionType: data.actionType,
      actionNonce: data.actionNonce,
      payload: data.payload as Prisma.InputJsonValue | undefined,
      accepted: data.accepted ?? true,
      rejectReason: data.rejectReason,
    },
  });
}

export function listPlayerActionsByRound(roundId: string): Promise<PlayerAction[]> {
  return prisma.playerAction.findMany({
    where: { roundId },
    orderBy: { receivedAt: "asc" },
  });
}
