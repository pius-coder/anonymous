import type { Client } from "colyseus";
import type { LiveRoomState } from "../rooms/schema/LiveRoomState.js";
import { PlayerState } from "../rooms/schema/LiveRoomState.js";
import { realtimeRepository } from "@session-jeu/db";
import { ROOM_SPAWNS } from "@session-jeu/game-engine";

export type LiveAuthInfo = {
  participationId: string;
  partyId: string;
  userId: string;
  role: string;
  connectionToken: string;
  participationStatus?: string;
};

export function addPlayer(state: LiveRoomState, client: Client, auth: LiveAuthInfo): PlayerState {
  const existing = findPlayerEntryByParticipationId(state, auth.participationId);
  if (existing && existing.sessionId !== client.sessionId) {
    state.players.delete(existing.sessionId);
  }

  const player = new PlayerState();
  player.sessionId = client.sessionId;
  player.userId = auth.userId;
  player.participationId = auth.participationId;
  player.role = auth.role;
  player.connected = true;
  player.status = statusFromParticipation(auth.participationStatus);
  const spawn = ROOM_SPAWNS[state.players.size % ROOM_SPAWNS.length];
  player.x = existing?.player.x || spawn.x;
  player.y = existing?.player.y || spawn.y;
  player.facing = existing?.player.facing || "down";
  player.lastProcessedInputSequence = existing?.player.lastProcessedInputSequence || 0;

  state.players.set(client.sessionId, player);
  state.connectedCount = Array.from(state.players.values()).filter((p) => p.connected).length;

  client.userData = { ...auth };

  return player;
}

export function markDisconnected(state: LiveRoomState, client: Client): void {
  const player = state.players.get(client.sessionId);
  if (player) {
    player.connected = false;
    player.previousStatus = player.status;
    player.status = "disconnected";
    state.connectedCount = Array.from(state.players.values()).filter((p) => p.connected).length;
  }
}

export function markReconnected(state: LiveRoomState, client: Client): void {
  const player = state.players.get(client.sessionId);
  if (player) {
    player.connected = true;
    player.status = player.previousStatus || "connected";
    player.previousStatus = "";
    state.connectedCount = Array.from(state.players.values()).filter((p) => p.connected).length;
  }
}

function statusFromParticipation(status: string | undefined): string {
  switch (status) {
    case "PLAYING":
      return "playing";
    case "FINISHED_ROUND":
      return "finished_round";
    case "WAITING_REVIEW":
      return "waiting_review";
    default:
      return "connected";
  }
}

export function removePlayer(state: LiveRoomState, client: Client): void {
  state.players.delete(client.sessionId);
  state.connectedCount = Array.from(state.players.values()).filter((p) => p.connected).length;
}

export async function persistReconnecting(participationId: string | undefined): Promise<void> {
  if (!participationId) return;
  await realtimeRepository.markReconnectingByParticipation(participationId).catch(() => {});
}

export async function persistConnected(participationId: string | undefined): Promise<void> {
  if (!participationId) return;
  await realtimeRepository.markConnectedByParticipation(participationId).catch(() => {});
}

export async function persistReconnect(participationId: string | undefined): Promise<void> {
  await persistConnected(participationId);
}

export async function persistDisconnect(participationId: string | undefined): Promise<void> {
  if (!participationId) return;
  await realtimeRepository.markDisconnectedByParticipation(participationId).catch(() => {});
}

export function findPlayerByParticipationId(state: LiveRoomState, participationId: string): PlayerState | undefined {
  return Array.from(state.players.values()).find(
    (p) => p.participationId === participationId,
  );
}

function findPlayerEntryByParticipationId(
  state: LiveRoomState,
  participationId: string,
): { sessionId: string; player: PlayerState } | undefined {
  for (const [sessionId, player] of state.players.entries()) {
    if (player.participationId === participationId) {
      return { sessionId, player };
    }
  }
  return undefined;
}
