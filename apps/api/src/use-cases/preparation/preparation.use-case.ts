import {
  prisma,
  partyRepository,
  participationRepository,
  announcementRepository,
  auditRepository,
} from "@session-jeu/db";
import {
  GameStatus,
  ParticipationStatus,
  openPreparation as domainOpenPreparation,
  lockPreparation as domainLockPreparation,
  checkIn,
  markReady as domainMarkReady,
  InvalidTransitionError,
} from "@session-jeu/game-engine";
import type { GameParticipation } from "@session-jeu/game-engine";
import type { Prisma } from "@prisma/client";

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

export type SendAnnouncementResult = {
  id: string;
  notificationJobId: string;
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

const PRESENT_ELIGIBLE = new Set(["REGISTERED", "PAID"]);
const PRESENT_ALREADY = new Set(["PRESENT", "READY"]);
const READY_ALREADY = new Set(["READY"]);
const CANCELLED = new Set(["ABANDONED", "CANCELLED"]);
const ABSENT_STATUSES = new Set(["REGISTERED", "PAID", "INVITED"]);

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

function mapDomainError(err: unknown): never {
  if (err instanceof InvalidTransitionError) {
    throw new PreparationUseCaseError("INVALID_TRANSITION", err.message, 422);
  }
  throw err;
}

export async function openPreparation(input: OpenPreparationInput): Promise<{ status: string }> {
  const party = await partyRepository.findPartyById(input.partyId);
  if (!party) {
    throw new PreparationUseCaseError("PARTY_NOT_FOUND", "Partie introuvable", 404);
  }

  // Idempotent: already open stays open; no timer ever starts the match.
  if (party.status === "PREPARATION_OPEN") {
    return { status: party.status };
  }

  if (party.status !== "SCHEDULED") {
    throw new PreparationUseCaseError(
      "PARTY_CANNOT_OPEN_PREPARATION",
      "La partie ne peut pas ouvrir la préparation dans son état actuel",
      422,
    );
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

  try {
    domainOpenPreparation(domainGame);
  } catch (err) {
    mapDomainError(err);
  }

  const updated = await partyRepository.updatePartyStatus(input.partyId, "PREPARATION_OPEN");

  await auditRepository.createAuditLog({
    userId: input.userId,
    action: "PREPARATION_OPEN",
    entity: "Party",
    entityId: input.partyId,
  });

  return { status: updated.status };
}

export async function markPresent(
  input: MarkPresentInput,
): Promise<{ id: string; status: string; readinessState: string }> {
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

  if (CANCELLED.has(participation.status)) {
    throw new PreparationUseCaseError("PARTICIPATION_CANCELLED", "Votre participation a été annulée", 422);
  }

  // Idempotent present (and already-ready is still present).
  if (PRESENT_ALREADY.has(participation.status)) {
    return {
      id: participation.id,
      status: participation.status,
      readinessState: participation.readinessState,
    };
  }

  if (!PRESENT_ELIGIBLE.has(participation.status)) {
    throw new PreparationUseCaseError(
      "NOT_ELIGIBLE",
      "Participation non éligible pour signaler la présence",
      422,
    );
  }

  // Domain allows Paid -> Present. Registered participants (free / unpaid path) check in at use-case.
  if (participation.status === "PAID") {
    try {
      checkIn(toDomainParticipation(participation));
    } catch (err) {
      mapDomainError(err);
    }
  }

  const updated = await participationRepository.updateParticipationStatusReadiness(
    participation.id,
    "PRESENT",
    "present",
  );

  return { id: updated.id, status: updated.status, readinessState: updated.readinessState };
}

export async function markReady(
  input: MarkReadyInput,
): Promise<{ id: string; status: string; readinessState: string }> {
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

  if (CANCELLED.has(participation.status)) {
    throw new PreparationUseCaseError("PARTICIPATION_CANCELLED", "Votre participation a été annulée", 422);
  }

  // Idempotent ready.
  if (READY_ALREADY.has(participation.status)) {
    return {
      id: participation.id,
      status: participation.status,
      readinessState: participation.readinessState,
    };
  }

  if (participation.status !== "PRESENT") {
    throw new PreparationUseCaseError(
      "NOT_PRESENT",
      "La présence doit être confirmée avant de signaler prêt",
      422,
    );
  }

  try {
    domainMarkReady(toDomainParticipation(participation));
  } catch (err) {
    mapDomainError(err);
  }

  const updated = await participationRepository.updateParticipationStatusReadiness(
    participation.id,
    "READY",
    "ready",
  );

  return { id: updated.id, status: updated.status, readinessState: updated.readinessState };
}

/**
 * Atomically creates Announcement + AuditLog + NotificationJob (PENDING intent only).
 * Delivery is owned by A-WORKERS — this task never sends the message.
 */
export async function sendPreparationAnnouncement(
  input: SendAnnouncementInput,
): Promise<SendAnnouncementResult> {
  const party = await partyRepository.findPartyById(input.partyId);
  if (!party) {
    throw new PreparationUseCaseError("PARTY_NOT_FOUND", "Partie introuvable", 404);
  }

  const allowedStatuses = ["PREPARATION_OPEN", "PREPARATION_LOCKED"];
  if (!allowedStatuses.includes(party.status)) {
    throw new PreparationUseCaseError(
      "PARTY_NOT_IN_PREPARATION",
      "La partie n'est pas en phase de préparation",
      422,
    );
  }

  const title = input.title.trim();
  const body = input.body.trim();
  if (!title || !body) {
    throw new PreparationUseCaseError("ANNOUNCEMENT_INVALID", "Titre et corps de l'annonce requis", 400);
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const announcement = await tx.announcement.create({
        data: {
          partyId: input.partyId,
          title,
          body,
          createdBy: input.userId,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: input.userId,
          action: "ANNOUNCEMENT_SEND",
          entity: "Announcement",
          entityId: announcement.id,
          metadata: {
            partyId: input.partyId,
            title,
            phase: "PREPARATION",
          } as Prisma.InputJsonValue,
        },
      });

      // Public NotificationJob shape (SEQ-02) — PENDING intent, no delivery.
      const job = await tx.notificationJob.create({
        data: {
          userId: input.userId,
          type: "PREPARATION_ANNOUNCEMENT",
          status: "PENDING",
          payload: {
            announcementId: announcement.id,
            partyId: input.partyId,
            title,
            body,
            phase: "PREPARATION",
          } as Prisma.InputJsonValue,
        },
      });

      return { id: announcement.id, notificationJobId: job.id };
    });
  } catch (err) {
    console.error("sendPreparationAnnouncement transaction failed:", err);
    throw new PreparationUseCaseError(
      "ANNOUNCEMENT_PERSIST_FAILED",
      "Échec de la persistance atomique de l'annonce",
      500,
    );
  }
}

export async function confirmStart(
  input: ConfirmStartInput,
): Promise<{ status: string; overriddenAbsents: number }> {
  const party = await partyRepository.findPartyById(input.partyId);
  if (!party) {
    throw new PreparationUseCaseError("PARTY_NOT_FOUND", "Partie introuvable", 404);
  }

  if (party.status === "PREPARATION_LOCKED") {
    return { status: party.status, overriddenAbsents: 0 };
  }

  if (party.status !== "PREPARATION_OPEN") {
    throw new PreparationUseCaseError(
      "PARTY_CANNOT_CONFIRM_START",
      "La partie ne peut pas confirmer le départ dans son état actuel",
      422,
    );
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

  try {
    domainLockPreparation(domainGame);
  } catch (err) {
    mapDomainError(err);
  }

  const participations = await participationRepository.listParticipationsByParty(input.partyId);
  const active = participations.filter((p) => !CANCELLED.has(p.status));
  const overriddenAbsents = active.filter((p) => ABSENT_STATUSES.has(p.status)).length;
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

  if (CANCELLED.has(participation.status)) {
    throw new PreparationUseCaseError("PARTICIPATION_CANCELLED", "Votre participation a été annulée", 422);
  }

  // Idempotent leave: already offline/registered.
  if (participation.status === "REGISTERED" && participation.readinessState === "offline") {
    return { status: participation.status };
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
    userName: null as string | null,
  }));

  const stats = {
    total: activeParticipations.length,
    present: activeParticipations.filter((p) => p.status === "PRESENT").length,
    ready: activeParticipations.filter((p) => p.status === "READY").length,
    noResponse: activeParticipations.filter(
      (p) =>
        p.readinessState === "noResponse" ||
        p.status === "REGISTERED" ||
        p.status === "PAID" ||
        p.status === "INVITED",
    ).length,
    absent: participations.filter((p) => p.status === "ABANDONED").length,
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
