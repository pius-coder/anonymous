import type { Client } from "colyseus";
import type { LiveRoomState } from "../rooms/schema/LiveRoomState.js";

export type PlayerSelfSnapshot = {
  id: string;
  connected: boolean;
  status: string;
};

export type PlayerSnapshot = {
  partyId: string;
  partyStatus: string;
  connectedCount: number;
  currentRoundId: string;
  currentRoundNumber: number;
  currentRoundStatus: string;
  roundDeadlineAt: number;
  self: PlayerSelfSnapshot;
};

export type AdminPlayerSnapshot = {
  sessionId: string;
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
  currentRoundId: string;
  currentRoundNumber: number;
  currentRoundStatus: string;
  roundDeadlineAt: number;
  players: AdminPlayerSnapshot[];
};

export type ReadonlySnapshot = {
  partyId: string;
  partyStatus: string;
  connectedCount: number;
  currentRoundId: string;
  currentRoundNumber: number;
  currentRoundStatus: string;
  roundDeadlineAt: number;
  playerCount: number;
};

export type SupportPlayerSnapshot = {
  id: string;
  connected: boolean;
  status: string;
};

export type SupportSnapshot = {
  partyId: string;
  partyStatus: string;
  connectedCount: number;
  currentRoundId: string;
  currentRoundNumber: number;
  currentRoundStatus: string;
  roundDeadlineAt: number;
  players: SupportPlayerSnapshot[];
};

export function getPlayerSnapshotForClient(
  state: LiveRoomState,
  client: Client,
): PlayerSnapshot | null {
  const player = state.players.get(client.sessionId);
  if (!player) return null;

  return {
    partyId: state.partyId,
    partyStatus: state.partyStatus,
    connectedCount: state.connectedCount,
    currentRoundId: state.currentRoundId,
    currentRoundNumber: state.currentRoundNumber,
    currentRoundStatus: state.currentRoundStatus,
    roundDeadlineAt: state.roundDeadlineAt,
    self: {
      id: player.participationId,
      connected: player.connected,
      status: player.status,
    },
  };
}

export function getAdminSnapshot(state: LiveRoomState): AdminSnapshot {
  const players = Array.from(state.players.entries()).map(([sessionId, player]) => ({
    sessionId,
    id: player.participationId,
    userId: player.userId,
    role: player.role,
    connected: player.connected,
    status: player.status,
  }));

  return {
    partyId: state.partyId,
    partyStatus: state.partyStatus,
    connectedCount: state.connectedCount,
    currentRoundId: state.currentRoundId,
    currentRoundNumber: state.currentRoundNumber,
    currentRoundStatus: state.currentRoundStatus,
    roundDeadlineAt: state.roundDeadlineAt,
    players,
  };
}

export function getReadonlySnapshot(state: LiveRoomState): ReadonlySnapshot {
  return {
    partyId: state.partyId,
    partyStatus: state.partyStatus,
    connectedCount: state.connectedCount,
    currentRoundId: state.currentRoundId,
    currentRoundNumber: state.currentRoundNumber,
    currentRoundStatus: state.currentRoundStatus,
    roundDeadlineAt: state.roundDeadlineAt,
    playerCount: state.players.size,
  };
}

export function getSupportSnapshot(state: LiveRoomState): SupportSnapshot {
  const players = Array.from(state.players.values()).map((player) => ({
    id: player.participationId,
    connected: player.connected,
    status: player.status,
  }));

  return {
    partyId: state.partyId,
    partyStatus: state.partyStatus,
    connectedCount: state.connectedCount,
    currentRoundId: state.currentRoundId,
    currentRoundNumber: state.currentRoundNumber,
    currentRoundStatus: state.currentRoundStatus,
    roundDeadlineAt: state.roundDeadlineAt,
    players,
  };
}
