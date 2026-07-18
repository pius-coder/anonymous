import { partyRepository, participationRepository, userRepository } from "@session-jeu/db";
import { cancelParticipation as domainCancelParticipation, ParticipationStatus, InvalidTransitionError } from "@session-jeu/game-engine";
import type { GameParticipation } from "@session-jeu/game-engine";

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
  paymentState: string;
  admissionState: string;
  readinessState: string;
  connectionState: string;
  createdAt: string;
  expiresAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
};

export type AdminParticipationDetail = ParticipationDetail & {
  userName: string | null;
  userEmail: string;
};

export type MyTicketDetail = ParticipationDetail & {
  partyCode: string;
  partyName: string;
  partyStatus: string;
  partyDescription: string | null;
  scheduledAt: string | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  roundProgram: unknown;
  entryFeeAmount: number | null;
  entryFeeCurrency: string;
  configVersion: number;
  feeVersion: number;
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
  paymentState: string;
  admissionState: string;
  readinessState: string;
  connectionState: string;
  createdAt: Date;
  expiresAt: Date | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
}): ParticipationDetail {
  return {
    id: p.id,
    partyId: p.partyId,
    userId: p.userId,
    role: p.role,
    status: p.status,
    paymentState: p.paymentState,
    admissionState: p.admissionState,
    readinessState: p.readinessState,
    connectionState: p.connectionState,
    createdAt: p.createdAt.toISOString(),
    expiresAt: p.expiresAt?.toISOString() ?? null,
    cancelledAt: p.cancelledAt?.toISOString() ?? null,
    cancellationReason: p.cancellationReason ?? null,
  };
}

function getPartyOrThrow(code: string) {
  return partyRepository.findPartyByCode(code);
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

  const expiresAt = party.scheduledAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000);
  const result = await participationRepository.tryRegisterWithCapacity({
    partyId: party.id,
    userId: input.userId,
    role: "player",
    status: "REGISTERED",
    idempotencyKey: input.idempotencyKey,
    expiresAt,
  });

  if (!result.ok) {
    if (result.reason === "CAPACITY_FULL") {
      throw new ParticipationUseCaseError("PARTY_FULL", "Cette partie est complète", 422);
    }
    throw new ParticipationUseCaseError("PARTY_NOT_FOUND", "Partie introuvable", 404);
  }

  return toParticipationDetail(result.participation);
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

function decimalToNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof value === "object" && value !== null && "toNumber" in value) {
    try {
      return (value as { toNumber: () => number }).toNumber();
    } catch {
      return null;
    }
  }
  return null;
}

export async function listMyTickets(userId: string): Promise<MyTicketDetail[]> {
  const participations = await participationRepository.listParticipationsByUser(userId);
  if (participations.length === 0) {
    return [];
  }

  const parties = await Promise.all(
    participations.map((participation) => partyRepository.findPartyById(participation.partyId)),
  );

  return participations.flatMap((participation, index) => {
    const party = parties[index];
    if (!party) return [];

    return {
      ...toParticipationDetail(participation),
      partyCode: party.code,
      partyName: party.name,
      partyStatus: party.status,
      partyDescription: party.description ?? null,
      scheduledAt: party.scheduledAt?.toISOString() ?? null,
      minPlayers: party.minPlayers,
      maxPlayers: party.maxPlayers,
      roundProgram: party.roundProgram,
      entryFeeAmount: decimalToNumber(party.entryFeeAmount),
      entryFeeCurrency: party.entryFeeCurrency ?? "XAF",
      configVersion: party.configVersion ?? 1,
      feeVersion: party.feeVersion ?? 1,
    };
  });
}
