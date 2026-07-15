import { randomUUID, randomBytes } from "node:crypto";
import { partyRepository, participationRepository, realtimeRepository } from "@session-jeu/db";
import { hashOpaqueToken } from "@session-jeu/shared";

const LIVE_TOKEN_TTL_MS = 60_000;
const ALLOWED_PARTY_STATUSES = ["PREPARATION_LOCKED", "ROUND_SETUP", "ROUND_BRIEFING", "ROUND_ACTIVE", "ROUND_CLOSING", "VERIFICATION", "RESULTS_PUBLISHED"];
const DEFAULT_LIVE_SERVER_URL = "ws://localhost:3002";

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

export async function createLiveAccess(input: CreateLiveAccessInput): Promise<CreateLiveAccessOutput> {
  const party = await partyRepository.findPartyById(input.partyId);
  if (!party) {
    throw new LiveAccessUseCaseError("PARTY_NOT_FOUND", "Partie introuvable", 404);
  }

  if (!ALLOWED_PARTY_STATUSES.includes(party.status)) {
    throw new LiveAccessUseCaseError("PARTY_NOT_LIVE", "Cette partie n'est pas en phase live", 422);
  }

  const participation = await participationRepository.findParticipation(input.partyId, input.userId);
  if (!participation) {
    throw new LiveAccessUseCaseError("PARTICIPATION_NOT_FOUND", "Participation introuvable", 404);
  }

  const allowedStatuses = ["PRESENT", "READY", "IN_ROOM", "PLAYING", "FINISHED_ROUND", "DISCONNECTED", "WAITING_REVIEW", "RESULTS_VISIBLE"];
  if (!allowedStatuses.includes(participation.status)) {
    throw new LiveAccessUseCaseError("PARTICIPATION_INACTIVE", "La participation n'est pas active", 403);
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
    endpoint: process.env.LIVE_SERVER_URL ?? DEFAULT_LIVE_SERVER_URL,
    expiresAt: connection.tokenExpiresAt.toISOString(),
  };
}
