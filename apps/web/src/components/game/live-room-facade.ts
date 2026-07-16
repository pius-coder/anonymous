/**
 * Facade live pour `/room` — ownership A-REALTIME.
 *
 * Ne jamais envoyer reconnectTimeout / maxClients / round state en options de join :
 * la politique et l'état de manche viennent exclusivement du serveur.
 *
 * L'aperçu local (preview) n'est PAS un chemin E2E live — voir e2e/room.spec.ts
 * (hors preuve Colyseus) et e2e/live-smoke.spec.ts (échoue si game-server indisponible).
 */
import { LiveAccessService } from "@/services/rpcServices";

export type LiveAccessGrant = {
  connectionToken: string;
  endpoint: string;
  roomId: string;
  expiresAt?: unknown;
};

export type LiveAccessResult =
  | { success: true; data: LiveAccessGrant }
  | { success: false; error?: string; previewAllowed: true };

/**
 * Options de join Colyseus strictement limitées au token et à l'identité de partie.
 * Toute option de politique serveur est volontairement absente.
 */
export type AuthoritativeJoinOptions = {
  partyId: string;
  connectionToken: string;
};

export async function requestLiveAccess(partyId: string): Promise<LiveAccessResult> {
  const access = await LiveAccessService.create(partyId);
  if (!access.success) {
    return {
      success: false,
      error: "LIVE_ACCESS_UNAVAILABLE",
      previewAllowed: true,
    };
  }
  return {
    success: true,
    data: {
      connectionToken: access.data.connectionToken,
      endpoint: access.data.endpoint,
      roomId: access.data.roomId,
      expiresAt: access.data.expiresAt,
    },
  };
}

export function buildJoinOptions(
  partyId: string,
  connectionToken: string,
): AuthoritativeJoinOptions {
  return { partyId, connectionToken };
}

/** Room name registered on the game-server (must match define()). */
export const GAME_ROOM_NAME = "game_room";
