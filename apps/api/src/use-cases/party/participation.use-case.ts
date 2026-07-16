import { partyRepository, participationRepository, userRepository } from "@session-jeu/db";
import { canRegister, cancelParticipation as domainCancelParticipation, ParticipationStatus, InvalidTransitionError } from "@session-jeu/game-engine";
import type { Game, GameParticipation } from "@session-jeu/game-engine";

export class ParticipationUseCaseError extends Error {
  readonly code: string;
  readonly httpStatus: number;

  constructor(code: string, message: string, httpStatus: number) {
    super(message);
    this.name = "ParticipationUseCaseError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export type RegisterForPartyInput = {
  code: string;
  userId: string;
  idempotencyKey?: string;
};

export type RegisterForPartyByIdInput = {
  partyId: string;
  userId: string;
  idempotencyKey?: string;
};

export type ParticipationDetail = {
  id: string;
  partyId: string;
  userId: string;
  role: string;
  status: string;
  readinessState: string;
  connectionState: string;
  createdAt: string;
};

export type AdminParticipationDetail = ParticipationDetail & {
  userName: string | null;
  userEmail: string;
};

export type CancelParticipationInput = {
  code: string;
  userId: string;
};

export type GetMyParticipationInput = {
  code: string;
  userId: string;
};

export type ListPartyParticipationsInput = {
  partyId: string;
};

function toParticipationDetail(p: {
  id: string;
  partyId: string;
  userId: string;
  role: string;
  status: string;
  readinessState: string;
  connectionState: string;
  createdAt: Date;
}): ParticipationDetail {
  return {
    id: p.id,
    partyId: p.partyId,
    userId: p.userId,
    role: p.role,
    status: p.status,
    readinessState: p.readinessState,
    connectionState: p.connectionState,
    createdAt: p.createdAt.toISOString(),
  };
}

function getPartyOrThrow(code: string) {
  return partyRepository.findPartyByCode(code);
}

function toDomainGame(p: {
  id: string;
  code: string;
  name: string;
  status: string;
  scheduledAt: Date | null;
  visibility: string;
  minPlayers: number | null;
  maxPlayers: number | null;
  roundProgram: unknown;
}): Game {
  return {
    id: p.id,
    code: p.code,
    name: p.name,
    status: 0 as never,
    scheduledAt: p.scheduledAt,
    visibility: p.visibility,
    minPlayers: p.minPlayers,
    maxPlayers: p.maxPlayers,
    roundProgram: p.roundProgram,
  };
}

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

export async function registerForPartyById(input: RegisterForPartyByIdInput): Promise<ParticipationDetail> {
  const party = await partyRepository.findPartyById(input.partyId);
  if (!party) {
    throw new ParticipationUseCaseError("PARTY_NOT_FOUND", "Partie introuvable", 404);
  }
  return registerForParty({
    code: party.code,
    userId: input.userId,
    idempotencyKey: input.idempotencyKey,
  });
}

export async function registerForParty(input: RegisterForPartyInput): Promise<ParticipationDetail> {
  const party = await getPartyOrThrow(input.code);
  if (!party) {
    throw new ParticipationUseCaseError("PARTY_NOT_FOUND", "Partie introuvable", 404);
  }

  if (party.visibility !== "public") {
    throw new ParticipationUseCaseError("PARTY_INACCESSIBLE", "Cette partie n'est pas accessible", 404);
  }

  const registrableStatuses = ["SCHEDULED", "PREPARATION_OPEN"];
  if (!registrableStatuses.includes(party.status)) {
    throw new ParticipationUseCaseError("PARTY_NOT_REGISTRABLE", "Cette partie n'accepte plus d'inscriptions", 422);
  }

  if (input.idempotencyKey) {
    const existingByIdempotency = await participationRepository.findParticipationByIdempotencyKey(input.idempotencyKey);
    if (existingByIdempotency) {
      return toParticipationDetail(existingByIdempotency);
    }
  }

  const existing = await participationRepository.findParticipation(party.id, input.userId);
  if (existing) {
    // Idempotent: already holding a seat.
    if (existing.status !== "ABANDONED") {
      return toParticipationDetail(existing);
    }
    // Reactivate a previously cancelled seat only if capacity allows.
    const currentCount = await participationRepository.countActiveByPartyId(party.id);
    const domainGame = toDomainGame(party);
    const capacity = canRegister(domainGame, currentCount);
    if (!capacity.allowed) {
      throw new ParticipationUseCaseError(
        "PARTY_FULL",
        capacity.reason === "PARTY_FULL" ? "Cette partie est complète" : "Inscription impossible",
        422,
      );
    }
    const reactivated = await participationRepository.reactivateParticipation(existing.id);
    return toParticipationDetail(reactivated);
  }

  const currentCount = await participationRepository.countActiveByPartyId(party.id);
  const domainGame = toDomainGame(party);
  const capacity = canRegister(domainGame, currentCount);
  if (!capacity.allowed) {
    throw new ParticipationUseCaseError(
      "PARTY_FULL",
      capacity.reason === "PARTY_FULL" ? "Cette partie est complète" : "Inscription impossible",
      422,
    );
  }

  const expiresAt = party.scheduledAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000);

  try {
    const created = await participationRepository.createParticipation({
      partyId: party.id,
      userId: input.userId,
      role: "player",
      status: "REGISTERED",
      idempotencyKey: input.idempotencyKey,
      expiresAt,
    });
    return toParticipationDetail(created);
  } catch (err) {
    // Concurrent double-submit: unique (partyId, userId) or idempotency key race.
    const raced = await participationRepository.findParticipation(party.id, input.userId);
    if (raced) {
      return toParticipationDetail(raced);
    }
    if (input.idempotencyKey) {
      const byKey = await participationRepository.findParticipationByIdempotencyKey(input.idempotencyKey);
      if (byKey) {
        return toParticipationDetail(byKey);
      }
    }
    throw err;
  }
}

export async function cancelMyParticipation(input: CancelParticipationInput): Promise<ParticipationDetail> {
  const party = await getPartyOrThrow(input.code);
  if (!party) {
    throw new ParticipationUseCaseError("PARTY_NOT_FOUND", "Partie introuvable", 404);
  }

  const participation = await participationRepository.findParticipation(party.id, input.userId);
  if (!participation) {
    throw new ParticipationUseCaseError("PARTICIPATION_NOT_FOUND", "Inscription introuvable", 404);
  }

  // Idempotent: already cancelled.
  if (participation.status === "ABANDONED") {
    return toParticipationDetail(participation);
  }

  const domainParticipation = toDomainParticipation(participation);
  try {
    domainCancelParticipation(domainParticipation);
  } catch (err) {
    if (err instanceof InvalidTransitionError) {
      throw new ParticipationUseCaseError("PARTICIPATION_CANNOT_CANCEL", "Cette inscription ne peut pas être annulée dans son état actuel", 422);
    }
    throw err;
  }

  const updated = await participationRepository.cancelParticipation(participation.id, "annulation par le joueur");

  return toParticipationDetail(updated);
}

export async function getMyParticipation(input: GetMyParticipationInput): Promise<ParticipationDetail> {
  const party = await getPartyOrThrow(input.code);
  if (!party) {
    throw new ParticipationUseCaseError("PARTY_NOT_FOUND", "Partie introuvable", 404);
  }

  const participation = await participationRepository.findParticipation(party.id, input.userId);
  if (!participation) {
    throw new ParticipationUseCaseError("PARTICIPATION_NOT_FOUND", "Inscription introuvable", 404);
  }

  return toParticipationDetail(participation);
}

export async function getParticipationById(input: {
  participationId: string;
  userId: string;
  roles: string[];
}): Promise<ParticipationDetail> {
  const participation = await participationRepository.findParticipationById(input.participationId);
  if (!participation) {
    throw new ParticipationUseCaseError("PARTICIPATION_NOT_FOUND", "Inscription introuvable", 404);
  }

  const isOwner = participation.userId === input.userId;
  const isStaff = input.roles.some((role) =>
    ["ADMIN", "SUPER_ADMIN", "SUPPORT"].includes(role),
  );
  if (!isOwner && !isStaff) {
    throw new ParticipationUseCaseError("PARTICIPATION_FORBIDDEN", "Permission insuffisante", 403);
  }

  return toParticipationDetail(participation);
}

export async function listPartyParticipations(input: ListPartyParticipationsInput): Promise<AdminParticipationDetail[]> {
  const party = await partyRepository.findPartyById(input.partyId);
  if (!party) {
    throw new ParticipationUseCaseError("PARTY_NOT_FOUND", "Partie introuvable", 404);
  }

  const participations = await participationRepository.listParticipationsByParty(input.partyId);

  if (participations.length === 0) {
    return [];
  }

  const userIds = [...new Set(participations.map((p) => p.userId))];
  const users = await userRepository.findUsersByIds(userIds);
  const userMap = new Map(users.map((u) => [u.id, u]));

  return participations.map((p) => {
    const user = userMap.get(p.userId);
    return {
      ...toParticipationDetail(p),
      userName: user?.name ?? null,
      userEmail: user?.email ?? "inconnu",
    };
  });
}
