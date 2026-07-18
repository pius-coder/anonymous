import { randomUUID, randomBytes } from "node:crypto";
import { partyRepository, participationRepository, realtimeRepository, roundRepository } from "@session-jeu/db";
import { hashOpaqueToken } from "@session-jeu/shared";

const LIVE_TOKEN_TTL_MS = 60_000;
const ALLOWED_PARTY_STATUSES = new Set([
  "PREPARATION_LOCKED",
  "ROUND_SETUP",
  "ROUND_BRIEFING",
  "ROUND_ACTIVE",
  "ROUND_CLOSING",
  "VERIFICATION",
  "RESULTS_PUBLISHED",
]);
const ROUND_REQUIRED_PARTY_STATUSES = new Set([
  "ROUND_SETUP",
  "ROUND_BRIEFING",
  "ROUND_ACTIVE",
  "ROUND_CLOSING",
  "VERIFICATION",
  "RESULTS_PUBLISHED",
]);
const LIVE_ROUND_STATUSES = new Set(["ACTIVE", "BRIEFING", "SUSPENDED", "CLOSING", "VERIFICATION"]);
const ALLOWED_PARTICIPATION_STATUSES = new Set([
  "PRESENT",
  "READY",
  "IN_ROOM",
  "PLAYING",
  "FINISHED_ROUND",
  "DISCONNECTED",
  "WAITING_REVIEW",
  "RESULTS_VISIBLE",
]);
const PLAYER_PAYMENT_STATES = new Set(["PAID"]);
const PLAYER_ADMISSION_STATES = new Set(["ADMITTED"]);

export class LiveAccessUseCaseError extends Error {
  readonly code: string;
  readonly httpStatus: number;

  constructor(code: string, message: string, httpStatus: number) {
    super(message);
    this.name = "LiveAccessUseCaseError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export type CreateLiveAccessInput = {
  partyId: string;
  userId: string;
};

export type CreateLiveAccessOutput = {
  connectionToken: string;
  roomId: string;
  endpoint: string;
  expiresAt: string;
};

function generateLiveToken(): string {
  return randomBytes(32).toString("base64url");
}

function resolveLiveServerUrl(): string {
  const url = process.env.GAME_WS_URL?.trim();
  if (!url) {
    throw new LiveAccessUseCaseError(
      "LIVE_ENDPOINT_REQUIRED",
      "GAME_WS_URL doit etre configure avant de servir le live",
      500,
    );
  }
  return url;
}

function normalizeRole(role: string | null | undefined): string {
  return (role ?? "").trim().toLowerCase();
}

function isPlayerRole(role: string | null | undefined): boolean {
  return normalizeRole(role) === "player";
}

function pickCurrentRound<T extends { status: string; number: number }>(rounds: T[]): T | undefined {
  if (rounds.length === 0) return undefined;
  const live = rounds.filter((round) => LIVE_ROUND_STATUSES.has(round.status.toUpperCase()));
  const pool = live.length > 0 ? live : rounds;
  return pool.reduce((best, round) => (round.number >= best.number ? round : best));
}

export async function createLiveAccess(input: CreateLiveAccessInput): Promise<CreateLiveAccessOutput> {
  const party = await partyRepository.findPartyById(input.partyId);
  if (!party) {
    throw new LiveAccessUseCaseError("PARTY_NOT_FOUND", "Partie introuvable", 404);
  }

  if (!ALLOWED_PARTY_STATUSES.has(party.status)) {
    throw new LiveAccessUseCaseError("PARTY_NOT_LIVE", "Cette partie n'est pas en phase live", 422);
  }

  const participation = await participationRepository.findParticipation(input.partyId, input.userId);
  if (!participation) {
    throw new LiveAccessUseCaseError("PARTICIPATION_NOT_FOUND", "Participation introuvable", 404);
  }

  if (!ALLOWED_PARTICIPATION_STATUSES.has(participation.status)) {
    throw new LiveAccessUseCaseError("PARTICIPATION_INACTIVE", "La participation n'est pas active", 403);
  }

  if (isPlayerRole(participation.role)) {
    if (!PLAYER_PAYMENT_STATES.has(participation.paymentState)) {
      throw new LiveAccessUseCaseError("PAYMENT_REQUIRED", "Le paiement valide est requis pour rejoindre le live", 403);
    }

    if (!PLAYER_ADMISSION_STATES.has(participation.admissionState)) {
      throw new LiveAccessUseCaseError("ROUND_PARTICIPANT_NOT_ADMITTED", "Le joueur n'est pas admis dans cette manche", 403);
    }
  }

  if (ROUND_REQUIRED_PARTY_STATUSES.has(party.status)) {
    const rounds = await roundRepository.listRoundsByParty(input.partyId);
    if (!pickCurrentRound(rounds)) {
      throw new LiveAccessUseCaseError("ROUND_NOT_READY", "Aucune manche autoritaire n'est disponible pour ce live", 422);
    }
  }

  const connectionId = randomUUID();
  const accessToken = generateLiveToken();
  const tokenHash = hashOpaqueToken(accessToken);
  const tokenExpiresAt = new Date(Date.now() + LIVE_TOKEN_TTL_MS);

  const connection = await realtimeRepository.upsertConnection(participation.id, {
    participationId: participation.id,
    connectionId,
    state: "pending",
    tokenHash,
    tokenExpiresAt,
  });

  return {
    connectionToken: accessToken,
    roomId: input.partyId,
    endpoint: resolveLiveServerUrl(),
    expiresAt: connection.tokenExpiresAt.toISOString(),
  };
}
