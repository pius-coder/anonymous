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
  currentRoundId: string;
  currentRoundNumber: number;
  currentRoundStatus: string;
  roundDeadlineAt: number;
  players: PlayerSnapshot[];
};

export type ReadonlySnapshot = {
  partyId: string;
  currentPhase: string;
  connectedCount: number;
  currentRoundId: string;
  currentRoundNumber: number;
  currentRoundStatus: string;
  roundDeadlineAt: number;
  playerCount: number;
  participants: Array<{
    label: string;
    status: string;
  }>;
  timeline: Array<{
    code: string;
    label: string;
  }>;
  publishedResultsAvailable: boolean;
};

export function getPlayerSnapshotForClient(
  state: LiveRoomState,
  client: Client,
): PlayerSnapshot | null {
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
    currentRoundId: state.currentRoundId,
    currentRoundNumber: state.currentRoundNumber,
    currentRoundStatus: state.currentRoundStatus,
    roundDeadlineAt: state.roundDeadlineAt,
    players,
  };
}

export function getReadonlySnapshot(state: LiveRoomState): ReadonlySnapshot {
  const participants = Array.from(state.players.values()).map((player, index) => ({
    label: `Participant ${index + 1}`,
    status: toReadonlyParticipantStatus(player.connected, player.status),
  }));
  const snapshot: ReadonlySnapshot = {
    partyId: state.partyId,
    currentPhase: state.currentRoundStatus || state.partyStatus,
    connectedCount: state.connectedCount,
    currentRoundId: state.currentRoundId,
    currentRoundNumber: state.currentRoundNumber,
    currentRoundStatus: state.currentRoundStatus,
    roundDeadlineAt: state.roundDeadlineAt,
    playerCount: state.players.size,
    participants,
    timeline: buildReadonlyTimeline(state, participants),
    publishedResultsAvailable: state.partyStatus === "RESULTS_PUBLISHED",
  };
  assertReadonlyObserverSafe(snapshot);
  return snapshot;
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
    const snap = getPlayerSnapshotForClient(state, client);
    if (snap) client.send("snapshot:player", snap);
  }

  return { accepted: true };
}

export function registerReadonlyHandlers(): void {
  registerCommandHandler("snapshot:request", handleSnapshotRequest);
}

function toReadonlyParticipantStatus(connected: boolean, status: string): string {
  if (!connected || status === "disconnected") return "Déconnecté";
  if (status === "eliminated" || status === "spectating") return "Éliminé";
  if (status === "finished_round" || status === "waiting_review") return "Terminé";
  return "Actif";
}

function buildReadonlyTimeline(
  state: LiveRoomState,
  participants: ReadonlySnapshot["participants"],
): ReadonlySnapshot["timeline"] {
  const finished = participants.filter((participant) => participant.status === "Terminé").length;
  const disconnected = participants.filter((participant) => participant.status === "Déconnecté").length;
  const events: ReadonlySnapshot["timeline"] = [];

  if (state.currentRoundStatus) {
    events.push({
      code: "ROUND_STATUS",
      label: `Manche ${state.currentRoundNumber || "—"} · ${String(state.currentRoundStatus).toUpperCase()}`,
    });
  }
  if (finished > 0) {
    events.push({
      code: "ROUND_FINISHED_COUNT",
      label: `${finished} participant${finished > 1 ? "s ont" : " a"} terminé la manche`,
    });
  }
  if (disconnected > 0) {
    events.push({
      code: "ROUND_DISCONNECTED_COUNT",
      label: `${disconnected} participant${disconnected > 1 ? "s sont" : " est"} hors ligne`,
    });
  }
  if (state.partyStatus === "RESULTS_PUBLISHED") {
    events.push({
      code: "RESULTS_PUBLISHED",
      label: "Résultats officiels publiés",
    });
  }
  if (events.length === 0) {
    events.push({
      code: "READONLY_CONNECTED",
      label: "Observation publique active",
    });
  }

  return events;
}

const READONLY_FORBIDDEN_KEYS = [
  "connection_token",
  "session_token",
  "provisional_score",
  "provisional_scores",
  "private_payload",
  "hidden_role",
  "cached_answer",
  "correct_answer",
  "partner_choice_id",
  "own_role_id",
  "userId",
  "role",
] as const;

function assertReadonlyObserverSafe(value: unknown, path = ""): void {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertReadonlyObserverSafe(entry, `${path}[${index}]`));
    return;
  }
  if (typeof value !== "object") return;

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const next = path ? `${path}.${key}` : key;
    if (READONLY_FORBIDDEN_KEYS.includes(key as (typeof READONLY_FORBIDDEN_KEYS)[number])) {
      throw new Error(`Readonly observer projection leaks forbidden field: ${next}`);
    }
    assertReadonlyObserverSafe(child, next);
  }
}
