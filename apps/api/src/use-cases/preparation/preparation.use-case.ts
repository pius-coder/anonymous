import { partyRepository, participationRepository, announcementRepository, auditRepository } from "@session-jeu/db";
import {
  GameStatus,
  ParticipationStatus,
  openPreparation as domainOpenPreparation,
  lockPreparation as domainLockPreparation,
  checkIn,
  markReady as domainMarkReady,
} from "@session-jeu/game-engine";
import type { GameParticipation } from "@session-jeu/game-engine";

export class PreparationUseCaseError extends Error {
  readonly code: string;
  readonly httpStatus: number;

  constructor(code: string, message: string, httpStatus: number) {
    super(message);
    this.name = "PreparationUseCaseError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export type OpenPreparationInput = {
  partyId: string;
  userId: string;
};

export type MarkPresentInput = {
  partyId: string;
  userId: string;
};

export type MarkReadyInput = {
  partyId: string;
  userId: string;
};

export type SendAnnouncementInput = {
  partyId: string;
  userId: string;
  title: string;
  body: string;
};

export type ConfirmStartInput = {
  partyId: string;
  userId: string;
  forceWithAbsents?: boolean;
  overrideReason?: string;
};

export type LeavePreparationInput = {
  partyId: string;
  userId: string;
};

export type PreparationStateOutput = {
  partyId: string;
  status: string;
  participants: Array<{
    id: string;
    userId: string;
    role: string;
    status: string;
    readinessState: string;
    userName: string | null;
  }>;
  announcements: Array<{
    id: string;
    title: string;
    body: string;
    createdBy: string;
    createdAt: string;
  }>;
  stats: {
    total: number;
    present: number;
    ready: number;
    noResponse: number;
    absent: number;
  };
};

const STATUS_MAP: Record<string, ParticipationStatus> = {
  INVITED: ParticipationStatus.Invited,
  REGISTERED: ParticipationStatus.Registered,
  PAID: ParticipationStatus.Paid,
  PRESENT: ParticipationStatus.Present,
  READY: ParticipationStatus.Ready,
  IN_ROOM: ParticipationStatus.InRoom,
  PLAYING: ParticipationStatus.Playing,
  FINISHED_ROUND: ParticipationStatus.FinishedRound,
  DISCONNECTED: ParticipationStatus.Disconnected,
  WAITING_REVIEW: ParticipationStatus.WaitingReview,
  RESULTS_VISIBLE: ParticipationStatus.ResultsVisible,
  COMPLETED: ParticipationStatus.Completed,
  ABANDONED: ParticipationStatus.Abandoned,
};

function toDomainParticipation(p: {
  id: string;
  partyId: string;
  userId: string;
  role: string;
  status: string;
  readinessState: string;
  connectionState: string;
}): GameParticipation {
  return {
    id: p.id,
    gameId: p.partyId,
    userId: p.userId,
    role: p.role as never,
    status: STATUS_MAP[p.status] ?? ParticipationStatus.UNSPECIFIED,
    readinessState: p.readinessState as never,
    connectionState: p.connectionState as never,
    rights: { canStart: false, canVerify: false, canPublish: false, canObserve: false },
  };
}

export async function openPreparation(input: OpenPreparationInput): Promise<{ status: string }> {
  const party = await partyRepository.findPartyById(input.partyId);
  if (!party) {
    throw new PreparationUseCaseError("PARTY_NOT_FOUND", "Partie introuvable", 404);
  }

  if (party.status !== "SCHEDULED") {
    throw new PreparationUseCaseError("PARTY_CANNOT_OPEN_PREPARATION", "La partie ne peut pas ouvrir la préparation dans son état actuel", 422);
  }

  const domainGame = {
    id: party.id,
    status: GameStatus.Scheduled,
    code: party.code,
    name: party.name,
    scheduledAt: party.scheduledAt,
    visibility: party.visibility,
    minPlayers: party.minPlayers,
    maxPlayers: party.maxPlayers,
    roundProgram: party.roundProgram,
  };

  domainOpenPreparation(domainGame);

  const updated = await partyRepository.updatePartyStatus(input.partyId, "PREPARATION_OPEN");

  await auditRepository.createAuditLog({
    userId: input.userId,
    action: "PREPARATION_OPEN",
    entity: "Party",
    entityId: input.partyId,
  });

  return { status: updated.status };
}

export async function markPresent(input: MarkPresentInput): Promise<{ id: string; status: string; readinessState: string }> {
  const party = await partyRepository.findPartyById(input.partyId);
  if (!party) {
    throw new PreparationUseCaseError("PARTY_NOT_FOUND", "Partie introuvable", 404);
  }

  if (party.status !== "PREPARATION_OPEN") {
    throw new PreparationUseCaseError("PREPARATION_NOT_OPEN", "La préparation n'est pas ouverte", 422);
  }

  const participation = await participationRepository.findParticipation(input.partyId, input.userId);
  if (!participation) {
    throw new PreparationUseCaseError("PARTICIPATION_NOT_FOUND", "Participation introuvable", 404);
  }

  const cancelStatuses = ["ABANDONED", "CANCELLED"];
  if (cancelStatuses.includes(participation.status)) {
    throw new PreparationUseCaseError("PARTICIPATION_CANCELLED", "Votre participation a été annulée", 422);
  }

  const domainP = toDomainParticipation(participation);
  checkIn(domainP);

  const updated = await participationRepository.updateParticipationStatusReadiness(
    participation.id,
    "PRESENT",
    "present",
  );

  return { id: updated.id, status: updated.status, readinessState: updated.readinessState };
}

export async function markReady(input: MarkReadyInput): Promise<{ id: string; status: string; readinessState: string }> {
  const party = await partyRepository.findPartyById(input.partyId);
  if (!party) {
    throw new PreparationUseCaseError("PARTY_NOT_FOUND", "Partie introuvable", 404);
  }

  if (party.status !== "PREPARATION_OPEN") {
    throw new PreparationUseCaseError("PREPARATION_NOT_OPEN", "La préparation n'est pas ouverte", 422);
  }

  const participation = await participationRepository.findParticipation(input.partyId, input.userId);
  if (!participation) {
    throw new PreparationUseCaseError("PARTICIPATION_NOT_FOUND", "Participation introuvable", 404);
  }

  const domainP = toDomainParticipation(participation);
  domainMarkReady(domainP);

  const updated = await participationRepository.updateParticipationStatusReadiness(
    participation.id,
    "READY",
    "ready",
  );

  return { id: updated.id, status: updated.status, readinessState: updated.readinessState };
}

export async function sendPreparationAnnouncement(input: SendAnnouncementInput): Promise<{ id: string }> {
  const party = await partyRepository.findPartyById(input.partyId);
  if (!party) {
    throw new PreparationUseCaseError("PARTY_NOT_FOUND", "Partie introuvable", 404);
  }

  const allowedStatuses = ["PREPARATION_OPEN", "PREPARATION_LOCKED"];
  if (!allowedStatuses.includes(party.status)) {
    throw new PreparationUseCaseError("PARTY_NOT_IN_PREPARATION", "La partie n'est pas en phase de préparation", 422);
  }

  const announcement = await announcementRepository.createAnnouncement({
    partyId: input.partyId,
    title: input.title,
    body: input.body,
    createdBy: input.userId,
  });

  await auditRepository.createAuditLog({
    userId: input.userId,
    action: "ANNOUNCEMENT_SEND",
    entity: "Announcement",
    entityId: announcement.id,
    metadata: { partyId: input.partyId, title: input.title },
  });

  return { id: announcement.id };
}

export async function confirmStart(input: ConfirmStartInput): Promise<{ status: string; overriddenAbsents: number }> {
  const party = await partyRepository.findPartyById(input.partyId);
  if (!party) {
    throw new PreparationUseCaseError("PARTY_NOT_FOUND", "Partie introuvable", 404);
  }

  if (party.status !== "PREPARATION_OPEN") {
    throw new PreparationUseCaseError("PARTY_CANNOT_CONFIRM_START", "La partie ne peut pas confirmer le départ dans son état actuel", 422);
  }

  const domainGame = {
    id: party.id,
    status: GameStatus.PreparationOpen,
    code: party.code,
    name: party.name,
    scheduledAt: party.scheduledAt,
    visibility: party.visibility,
    minPlayers: party.minPlayers,
    maxPlayers: party.maxPlayers,
    roundProgram: party.roundProgram,
  };

  domainLockPreparation(domainGame);

  const participations = await participationRepository.listParticipationsByParty(input.partyId);

  const absentStatuses = new Set(["REGISTERED", "PAID"]);
  const overriddenAbsents = participations.filter((p) => absentStatuses.has(p.status)).length;
  const overrideReason = input.overrideReason?.trim();
  if (overriddenAbsents > 0 && (!input.forceWithAbsents || !overrideReason)) {
    throw new PreparationUseCaseError(
      "ABSENT_CONFIRMATION_REQUIRED",
      "Une confirmation avec raison est requise pour verrouiller la préparation avec des absents",
      422,
    );
  }

  await partyRepository.updatePartyStatus(input.partyId, "PREPARATION_LOCKED");

  await auditRepository.createAuditLog({
    userId: input.userId,
    action: "CONFIRM_START",
    entity: "Party",
    entityId: input.partyId,
    metadata: {
      forceWithAbsents: input.forceWithAbsents ?? false,
      overriddenAbsents,
      overrideReason: overrideReason ?? null,
    },
  });

  return { status: "PREPARATION_LOCKED", overriddenAbsents };
}

export async function leavePreparation(input: LeavePreparationInput): Promise<{ status: string }> {
  const party = await partyRepository.findPartyById(input.partyId);
  if (!party) {
    throw new PreparationUseCaseError("PARTY_NOT_FOUND", "Partie introuvable", 404);
  }

  if (party.status !== "PREPARATION_OPEN") {
    throw new PreparationUseCaseError("PREPARATION_NOT_OPEN", "La préparation n'est pas ouverte", 422);
  }

  const participation = await participationRepository.findParticipation(input.partyId, input.userId);
  if (!participation) {
    throw new PreparationUseCaseError("PARTICIPATION_NOT_FOUND", "Participation introuvable", 404);
  }

  const updated = await participationRepository.updateParticipation(participation.id, {
    status: "REGISTERED",
    readinessState: "offline",
  });

  return { status: updated.status };
}

export async function getPreparationState(input: { partyId: string }): Promise<PreparationStateOutput> {
  const party = await partyRepository.findPartyById(input.partyId);
  if (!party) {
    throw new PreparationUseCaseError("PARTY_NOT_FOUND", "Partie introuvable", 404);
  }

  const [participations, announcements] = await Promise.all([
    participationRepository.listParticipationsByParty(input.partyId),
    announcementRepository.findAnnouncementsByParty(input.partyId),
  ]);

  const activeParticipations = participations.filter((p) => p.status !== "ABANDONED");

  const participants = activeParticipations.map((p) => ({
    id: p.id,
    userId: p.userId,
    role: p.role,
    status: p.status,
    readinessState: p.readinessState,
    userName: null,
  }));

  const stats = {
    total: activeParticipations.length,
    present: activeParticipations.filter((p) => p.status === "PRESENT").length,
    ready: activeParticipations.filter((p) => p.status === "READY").length,
    noResponse: activeParticipations.filter((p) => p.readinessState === "noResponse" || p.status === "REGISTERED" || p.status === "PAID").length,
    absent: activeParticipations.filter((p) => p.status === "ABANDONED").length,
  };

  return {
    partyId: input.partyId,
    status: party.status,
    participants,
    announcements: announcements.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      createdBy: a.createdBy,
      createdAt: a.createdAt.toISOString(),
    })),
    stats,
  };
}
