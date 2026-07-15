import { realtimeRepository } from "@session-jeu/db";
import { hashOpaqueToken } from "@session-jeu/shared";
import { normalizeLiveRole } from "./live-roles.js";

export type LiveAuthResult = {
  valid: boolean;
  participationId?: string;
  partyId?: string;
  userId?: string;
  role?: string;
  participationStatus?: string;
  reason?: string;
};

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

  const allowedParticipationStatuses = ["PRESENT", "READY", "IN_ROOM", "PLAYING", "FINISHED_ROUND", "DISCONNECTED", "WAITING_REVIEW", "RESULTS_VISIBLE"];
  if (!allowedParticipationStatuses.includes(connection.participation.status)) {
    return { valid: false, reason: "PARTICIPATION_INACTIVE" };
  }

  return {
    valid: true,
    participationId: connection.participationId,
    partyId: connection.participation.partyId,
    userId: connection.participation.userId,
    role: normalizeLiveRole(connection.participation.role),
    participationStatus: connection.participation.status,
  };
}
