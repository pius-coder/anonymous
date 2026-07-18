/**
 * Facade live pour `/room` — ownership A-REALTIME.
 *
 * Ne jamais envoyer reconnectTimeout / maxClients / round state en options de join :
 * la politique et l'état de manche viennent exclusivement du serveur.
 *
 * Aucun fallback preview implicite n'est autorisé sur `/room` :
 * les erreurs live doivent rester explicites et actionnables.
 */
import { LiveAccessService } from "@/services/rpcServices";
import type { RpcFailure } from "@/lib/rpc";

export type LiveAccessGrant = {
  connectionToken: string;
  endpoint: string;
  roomId: string;
  expiresAt?: unknown;
};

export type LiveAccessResult =
  | { success: true; data: LiveAccessGrant }
  | { success: false; error?: string };

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
      error: (access as RpcFailure).error.message || "LIVE_ACCESS_UNAVAILABLE",
    };
  }
  const grant = access.data as LiveAccessGrant;
  return {
    success: true,
    data: {
      connectionToken: grant.connectionToken,
      endpoint: grant.endpoint,
      roomId: grant.roomId,
      expiresAt: grant.expiresAt,
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
