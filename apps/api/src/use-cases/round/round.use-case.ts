import { auditRepository, participationRepository, partyRepository, roundRepository } from "@session-jeu/db";
import {
  RoundStatus,
  ParticipationStatus,
  activateRound as domainActivateRound,
  closeRoundForResolution,
  enterRoundVerification,
  finishPlayerRound as domainFinishPlayerRound,
  isRoundInputAccepted,
  pauseRound as domainPauseRound,
  resumeRound as domainResumeRound,
  startRoundBriefing as domainStartRoundBriefing,
} from "@session-jeu/game-engine";
import type { Round as DomainRound } from "@session-jeu/game-engine";

export class RoundUseCaseError extends Error {
  readonly code: string;
  readonly httpStatus: number;

  constructor(code: string, message: string, httpStatus: number) {
    super(message);
    this.name = "RoundUseCaseError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export type ConfigureRoundInput = {
  partyId: string;
  roundNumber: number;
  minigameId: string;
  configuredBy: string;
  durationSeconds?: number;
  auditReason?: string;
};

export type RoundCommandInput = {
  roundId: string;
  actorId: string;
  reason?: string;
  systemTriggered?: boolean;
};

export type FinishPlayerRoundInput = {
  roundId: string;
  userId: string;
  actionNonce: string;
  payload?: PlayerActionPayload;
};

export type RoundLifecycleResult = {
  roundId: string;
  partyId: string;
  roundNumber: number;
  status: string;
  deadlineAt: string | null;
};

export type PlayerActionPayload = Record<string, string | number | boolean | null>;

const PLAYER_ROLES = new Set(["player", "PLAYER"]);

const ROUND_STATUS_TO_DOMAIN: Record<string, RoundStatus> = {
  SETUP: RoundStatus.Setup,
  BRIEFING: RoundStatus.Briefing,
  ACTIVE: RoundStatus.Active,
  SUSPENDED: RoundStatus.Suspended,
  CLOSING: RoundStatus.Closing,
  RESOLVED: RoundStatus.Resolved,
  VERIFICATION: RoundStatus.Verified,
  VERIFIED: RoundStatus.Verified,
  PUBLISHED: RoundStatus.Published,
};

function toDomainRound(round: {
  id: string;
  partyId: string;
  number: number;
  minigame: string;
  status: string;
  deadline?: Date | null;
}, timing?: { deadlineAt?: Date | null; pausedAt?: Date | null; remainingMs?: number | null }): DomainRound {
  return {
    id: round.id,
    gameId: round.partyId,
    number: round.number,
    miniGameKey: round.minigame,
    status: ROUND_STATUS_TO_DOMAIN[round.status] ?? RoundStatus.UNSPECIFIED,
    deadlineAt: timing?.deadlineAt ?? round.deadline ?? null,
    pausedAt: timing?.pausedAt ?? null,
    remainingMs: timing?.remainingMs ?? null,
  };
}

function toResult(round: {
  id: string;
  partyId: string;
  number: number;
  status: string;
  deadline: Date | null;
}): RoundLifecycleResult {
  return {
    roundId: round.id,
    partyId: round.partyId,
    roundNumber: round.number,
    status: round.status,
    deadlineAt: round.deadline?.toISOString() ?? null,
  };
}

async function audit(userId: string | undefined, action: string, roundId: string, metadata?: unknown): Promise<void> {
  await auditRepository.createAuditLog({
    userId,
    action,
    entity: "Round",
    entityId: roundId,
    metadata,
  });
}

async function requireRound(roundId: string) {
  const round = await roundRepository.findRoundById(roundId);
  if (!round) {
    throw new RoundUseCaseError("ROUND_NOT_FOUND", "Manche introuvable", 404);
  }
  return round;
}

export async function configureRound(input: ConfigureRoundInput): Promise<RoundLifecycleResult> {
  const party = await partyRepository.findPartyById(input.partyId);
  if (!party) {
    throw new RoundUseCaseError("PARTY_NOT_FOUND", "Partie introuvable", 404);
  }

  const allowedStatuses = new Set(["PREPARATION_LOCKED", "READY_TO_START", "ROUND_SETUP"]);
  if (!allowedStatuses.has(party.status)) {
    throw new RoundUseCaseError("ROUND_NOT_READY", "La partie n'est pas prête pour configurer une manche", 422);
  }

  const existing = await roundRepository.findRoundByPartyNumber(input.partyId, input.roundNumber);
  if (existing && ["ACTIVE", "SUSPENDED", "VERIFICATION", "PUBLISHED"].includes(existing.status)) {
    throw new RoundUseCaseError("ROUND_ALREADY_ACTIVE", "Cette manche ne peut plus être reconfigurée", 409);
  }

  const round = existing ?? await roundRepository.createRound({
    partyId: input.partyId,
    number: input.roundNumber,
    minigame: input.minigameId,
    status: "SETUP",
  });

  if (input.durationSeconds != null) {
    const durationMs = input.durationSeconds * 1000;
    await roundRepository.createOrUpdateRoundDeadline({
      roundId: round.id,
      deadlineAt: null,
      durationMs,
      pausedAt: null,
      remainingMs: null,
      closedAt: null,
    });
  }

  await partyRepository.updatePartyStatus(input.partyId, "ROUND_SETUP");
  await audit(input.configuredBy, "ROUND_CONFIGURE", round.id, {
    partyId: input.partyId,
    roundNumber: input.roundNumber,
    minigameId: input.minigameId,
    durationSeconds: input.durationSeconds ?? null,
    reason: input.auditReason ?? null,
  });

  const updated = await requireRound(round.id);
  return toResult(updated);
}

export async function startRoundBriefing(input: RoundCommandInput): Promise<RoundLifecycleResult> {
  const round = await requireRound(input.roundId);
  const domainRound = domainStartRoundBriefing(toDomainRound(round));
  const updated = await roundRepository.updateRoundLifecycle(round.id, { status: "BRIEFING" });
  await partyRepository.updatePartyStatus(round.partyId, "ROUND_BRIEFING");
  await audit(input.actorId, "ROUND_BRIEFING_START", round.id, { status: RoundStatus[domainRound.status] });
  return toResult(updated);
}

export async function activateRound(input: RoundCommandInput): Promise<RoundLifecycleResult> {
  const round = await requireRound(input.roundId);
  const domainRound = domainActivateRound(toDomainRound(round));
  const now = new Date();
  const deadlineState = await roundRepository.findRoundDeadlineByRoundId(round.id).catch(() => null);
  const deadlineAt = deadlineState ? new Date(now.getTime() + deadlineState.durationMs) : round.deadline;
  const updated = await roundRepository.updateRoundLifecycle(round.id, {
    status: "ACTIVE",
    startedAt: now,
    deadline: deadlineAt,
  });

  const participations = await participationRepository.listParticipationsByParty(round.partyId);
  const admitted = participations.filter((p) => PLAYER_ROLES.has(p.role) && ["READY", "IN_ROOM"].includes(p.status));
  await Promise.all(admitted.map(async (p) => {
    await roundRepository.upsertRoundParticipantStatus(round.id, p.id, "PLAYING");
    await participationRepository.updateParticipationStatus(p.id, "PLAYING");
  }));

  if (deadlineState) {
    await roundRepository.updateRoundDeadline(round.id, {
      deadlineAt,
      pausedAt: null,
      remainingMs: null,
      closedAt: null,
    });
  }

  await partyRepository.updatePartyStatus(round.partyId, "ROUND_ACTIVE");
  await audit(input.actorId, "ROUND_ACTIVATE", round.id, {
    status: RoundStatus[domainRound.status],
    admittedCount: admitted.length,
  });
  return toResult(updated);
}

export async function pauseRound(input: RoundCommandInput): Promise<RoundLifecycleResult> {
  const round = await requireRound(input.roundId);
  const now = new Date();
  const deadlineState = await roundRepository.findRoundDeadlineByRoundId(round.id).catch(() => null);
  const domainRound = domainPauseRound(toDomainRound(round, deadlineState ?? undefined), now);
  const updated = await roundRepository.updateRoundLifecycle(round.id, { status: "SUSPENDED" });

  if (deadlineState || round.deadline) {
    await roundRepository.updateRoundDeadline(round.id, {
      pausedAt: now,
      remainingMs: domainRound.remainingMs,
    }).catch(() => undefined);
  }

  await partyRepository.updatePartyStatus(round.partyId, "PAUSED");
  await audit(input.actorId, "ROUND_PAUSE", round.id, { reason: input.reason ?? null });
  return toResult(updated);
}

export async function resumeRound(input: RoundCommandInput): Promise<RoundLifecycleResult> {
  const round = await requireRound(input.roundId);
  const deadlineState = await roundRepository.findRoundDeadlineByRoundId(round.id).catch(() => null);
  const domainRound = domainResumeRound(toDomainRound(round, deadlineState ?? undefined));
  const updated = await roundRepository.updateRoundLifecycle(round.id, {
    status: "ACTIVE",
    deadline: domainRound.deadlineAt,
  });

  if (deadlineState || domainRound.deadlineAt) {
    await roundRepository.updateRoundDeadline(round.id, {
      deadlineAt: domainRound.deadlineAt ?? round.deadline ?? new Date(),
      pausedAt: null,
      remainingMs: null,
    }).catch(() => undefined);
  }

  await partyRepository.updatePartyStatus(round.partyId, "ROUND_ACTIVE");
  await audit(input.actorId, "ROUND_RESUME", round.id, { reason: input.reason ?? null });
  return toResult(updated);
}

export async function closeRound(input: RoundCommandInput): Promise<RoundLifecycleResult> {
  const round = await requireRound(input.roundId);
  if (!["ACTIVE", "SUSPENDED"].includes(round.status)) {
    throw new RoundUseCaseError("ROUND_NOT_ACTIVE", "La manche n'est pas active", 422);
  }

  const closing = closeRoundForResolution(toDomainRound(round));
  const verified = enterRoundVerification(closing);
  const updated = await roundRepository.updateRoundLifecycle(round.id, { status: "VERIFICATION" });
  await roundRepository.updateRoundDeadline(round.id, { closedAt: new Date() }).catch(() => undefined);

  const participants = await roundRepository.listRoundParticipants(round.id);
  await Promise.all(participants.map(async (p) => {
    await roundRepository.upsertRoundParticipantStatus(round.id, p.participationId, "WAITING_REVIEW", p.finishedAt);
    await participationRepository.updateParticipationStatus(p.participationId, "WAITING_REVIEW");
  }));

  await partyRepository.updatePartyStatus(round.partyId, "ROUND_VERIFICATION");
  await audit(input.systemTriggered ? undefined : input.actorId, "ROUND_CLOSE", round.id, {
    reason: input.reason ?? null,
    systemTriggered: input.systemTriggered ?? false,
    status: RoundStatus[verified.status],
  });
  return toResult(updated);
}

export async function finishPlayerRound(input: FinishPlayerRoundInput): Promise<{ status: string; duplicate: boolean }> {
  const round = await requireRound(input.roundId);
  const participation = await participationRepository.findParticipation(round.partyId, input.userId);
  if (!participation) {
    throw new RoundUseCaseError("PARTICIPATION_NOT_FOUND", "Participation introuvable", 404);
  }

  const existing = await roundRepository.findPlayerActionByNonce(round.id, participation.id, input.actionNonce);
  if (existing) {
    return { status: existing.accepted ? "FINISHED_ROUND" : "REJECTED", duplicate: true };
  }

  if (!PLAYER_ROLES.has(participation.role)) {
    throw new RoundUseCaseError("ROUND_PARTICIPANT_NOT_ADMITTED", "Le joueur n'est pas admis dans cette manche", 422);
  }

  const domainRound = toDomainRound(round);
  const isLate = !isRoundInputAccepted(domainRound) || (round.deadline != null && round.deadline.getTime() < Date.now());
  if (isLate) {
    await createPlayerActionWithDuplicateFallback({
      roundId: round.id,
      participationId: participation.id,
      actionType: "finish",
      actionNonce: input.actionNonce,
      payload: input.payload,
      accepted: false,
      rejectReason: "LATE_INPUT",
    });
    throw new RoundUseCaseError("LATE_INPUT", "La manche est fermée pour ce joueur", 422);
  }

  const roundParticipants = await roundRepository.listRoundParticipants(round.id);
  const roundParticipant = roundParticipants.find((p) => p.participationId === participation.id);
  if (!roundParticipant || roundParticipant.status !== "PLAYING") {
    await createPlayerActionWithDuplicateFallback({
      roundId: round.id,
      participationId: participation.id,
      actionType: "finish",
      actionNonce: input.actionNonce,
      payload: input.payload,
      accepted: false,
      rejectReason: "ROUND_PARTICIPANT_NOT_ADMITTED",
    });
    throw new RoundUseCaseError("ROUND_PARTICIPANT_NOT_ADMITTED", "Le joueur n'est pas admis dans cette manche", 422);
  }

  domainFinishPlayerRound({
    id: participation.id,
    gameId: participation.partyId,
    userId: participation.userId,
    role: participation.role as never,
    status: ParticipationStatus.Playing,
    readinessState: participation.readinessState as never,
    connectionState: participation.connectionState as never,
    rights: { canStart: false, canVerify: false, canPublish: false, canObserve: false },
  });

  const finishedAt = new Date();
  const duplicate = await createPlayerActionWithDuplicateFallback({
    roundId: round.id,
    participationId: participation.id,
    actionType: "finish",
    actionNonce: input.actionNonce,
    payload: input.payload,
    accepted: true,
  });
  if (duplicate) {
    return { status: duplicate.accepted ? "FINISHED_ROUND" : "REJECTED", duplicate: true };
  }
  await roundRepository.upsertRoundParticipantStatus(round.id, participation.id, "FINISHED_ROUND", finishedAt);
  await participationRepository.updateParticipationStatus(participation.id, "FINISHED_ROUND");

  return { status: "FINISHED_ROUND", duplicate: false };
}

async function createPlayerActionWithDuplicateFallback(
  data: Parameters<typeof roundRepository.createPlayerAction>[0],
) {
  try {
    await roundRepository.createPlayerAction(data);
    return null;
  } catch (err) {
    const existing = await roundRepository.findPlayerActionByNonce(
      data.roundId,
      data.participationId,
      data.actionNonce,
    ).catch(() => null);
    if (existing) {
      return existing;
    }
    throw err;
  }
}
