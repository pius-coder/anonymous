import { participationRepository, partyRepository, realtimeRepository, roundRepository } from "@session-jeu/db";
import { hashOpaqueToken } from "@session-jeu/shared";
import { isPlayerRole, normalizeLiveRole } from "./live-roles.js";

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
const LIVE_PARTICIPATION_STATUSES = new Set([
  "PRESENT",
  "READY",
  "IN_ROOM",
  "PLAYING",
  "FINISHED_ROUND",
  "DISCONNECTED",
  "WAITING_REVIEW",
  "RESULTS_VISIBLE",
]);
const LIVE_ROUND_STATUSES = new Set(["ACTIVE", "BRIEFING", "SUSPENDED", "CLOSING", "VERIFICATION"]);
const PLAYER_PAYMENT_STATES = new Set(["PAID"]);
const PLAYER_ADMISSION_STATES = new Set(["ADMITTED"]);

export type LiveAuthResult = {
  valid: boolean;
  participationId?: string;
  partyId?: string;
  userId?: string;
  role?: string;
  participationStatus?: string;
  reason?: string;
};

function pickCurrentRound<T extends { status: string; number: number }>(rounds: T[]): T | undefined {
  if (rounds.length === 0) return undefined;
  const live = rounds.filter((round) => LIVE_ROUND_STATUSES.has(round.status.toUpperCase()));
  const pool = live.length > 0 ? live : rounds;
  return pool.reduce((best, round) => (round.number >= best.number ? round : best));
}

export async function validateLiveToken(token: string): Promise<LiveAuthResult> {
  const connection = await realtimeRepository.findByTokenHash(hashOpaqueToken(token));

  if (!connection) {
    return { valid: false, reason: "INVALID_TOKEN" };
  }

  if (new Date() > connection.tokenExpiresAt) {
    return { valid: false, reason: "TOKEN_EXPIRED" };
  }

  if (connection.state === "disconnected" && connection.disconnectedAt) {
    return { valid: false, reason: "CONNECTION_CLOSED" };
  }

  const participation = await participationRepository.findParticipationById(connection.participationId);
  if (!participation) {
    return { valid: false, reason: "PARTICIPATION_NOT_FOUND" };
  }

  if (!LIVE_PARTICIPATION_STATUSES.has(participation.status)) {
    return { valid: false, reason: "PARTICIPATION_INACTIVE" };
  }

  const role = normalizeLiveRole(participation.role);
  if (isPlayerRole(role)) {
    if (!PLAYER_PAYMENT_STATES.has(participation.paymentState)) {
      return { valid: false, reason: "PAYMENT_REQUIRED" };
    }
    if (!PLAYER_ADMISSION_STATES.has(participation.admissionState)) {
      return { valid: false, reason: "ROUND_PARTICIPANT_NOT_ADMITTED" };
    }
  }

  const party = await partyRepository.findPartyById(participation.partyId);
  if (!party) {
    return { valid: false, reason: "PARTY_NOT_FOUND" };
  }

  if (!ALLOWED_PARTY_STATUSES.has(party.status)) {
    return { valid: false, reason: "PARTY_NOT_LIVE" };
  }

  if (ROUND_REQUIRED_PARTY_STATUSES.has(party.status)) {
    const rounds = await roundRepository.listRoundsByParty(participation.partyId);
    if (!pickCurrentRound(rounds)) {
      return { valid: false, reason: "ROUND_NOT_READY" };
    }
  }

  return {
    valid: true,
    participationId: connection.participationId,
    partyId: participation.partyId,
    userId: participation.userId,
    role,
    participationStatus: participation.status,
  };
}
