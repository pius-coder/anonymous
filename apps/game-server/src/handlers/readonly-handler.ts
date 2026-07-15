import type { Client } from "colyseus";
import type { LiveRoomState } from "../rooms/schema/LiveRoomState.js";
import type { CommandMessage } from "./command-dispatcher.js";
import { registerCommandHandler } from "./command-dispatcher.js";
import { canRequestAdminSnapshot, canRequestReadonlySnapshot, isPlayerRole } from "../auth/live-roles.js";

export type PlayerSnapshot = {
  id: string;
  userId: string;
  role: string;
  connected: boolean;
  status: string;
};

export type AdminSnapshot = {
  partyId: string;
  partyStatus: string;
  connectedCount: number;
  currentRoundNumber: number;
  currentRoundStatus: string;
  players: PlayerSnapshot[];
};

export type ReadonlySnapshot = {
  partyId: string;
  connectedCount: number;
  currentRoundNumber: number;
  currentRoundStatus: string;
  playerCount: number;
};

function getPlayerSnapshot(state: LiveRoomState, client: Client): PlayerSnapshot | null {
  const player = state.players.get(client.sessionId);
  if (!player) return null;

  return {
    id: player.participationId,
    userId: player.userId,
    role: player.role,
    connected: player.connected,
    status: player.status,
  };
}

export function getAdminSnapshot(state: LiveRoomState): AdminSnapshot {
  const players = Array.from(state.players.values()).map((p) => ({
    id: p.participationId,
    userId: p.userId,
    role: p.role,
    connected: p.connected,
    status: p.status,
  }));

  return {
    partyId: state.partyId,
    partyStatus: state.partyStatus,
    connectedCount: state.connectedCount,
    currentRoundNumber: state.currentRoundNumber,
    currentRoundStatus: state.currentRoundStatus,
    players,
  };
}

export function getReadonlySnapshot(state: LiveRoomState): ReadonlySnapshot {
  return {
    partyId: state.partyId,
    connectedCount: state.connectedCount,
    currentRoundNumber: state.currentRoundNumber,
    currentRoundStatus: state.currentRoundStatus,
    playerCount: state.players.size,
  };
}

function handleSnapshotRequest(
  state: LiveRoomState,
  client: Client,
  command: CommandMessage,
): { accepted: boolean; error?: string } {
  const player = state.players.get(client.sessionId);
  if (!player) return { accepted: false, error: "NOT_IN_ROOM" };

  const audience = command.payload?.audience as string | undefined;

  if (audience === "admin" && !canRequestAdminSnapshot(player.role)) {
    return { accepted: false, error: "ROLE_NOT_ALLOWED" };
  }

  if (audience === "observer" && !canRequestReadonlySnapshot(player.role)) {
    return { accepted: false, error: "ROLE_NOT_ALLOWED" };
  }

  if (audience === "admin") {
    client.send("snapshot:admin", getAdminSnapshot(state));
  } else if (audience === "observer") {
    client.send("snapshot:readonly", getReadonlySnapshot(state));
  } else {
    if (!isPlayerRole(player.role)) {
      return { accepted: false, error: "ROLE_NOT_ALLOWED" };
    }
    const snap = getPlayerSnapshot(state, client);
    if (snap) client.send("snapshot:player", snap);
  }

  return { accepted: true };
}

export function registerReadonlyHandlers(): void {
  registerCommandHandler("snapshot:request", handleSnapshotRequest);
}
