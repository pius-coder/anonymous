import type { Client } from "colyseus";
import type { LiveRoomState } from "../rooms/schema/LiveRoomState.js";
import type { CommandMessage } from "./command-dispatcher.js";
import { registerCommandHandler } from "./command-dispatcher.js";
import { canSubmitPlayerCommand } from "../auth/live-roles.js";
import { roundRepository } from "@session-jeu/db";

const ACTIVE_STATUS = "active";
const PAUSED_STATUS = "paused";
const LATE_STATUSES = new Set(["closing", "closed", "verification", "waiting_review"]);
const ADMITTED_PLAYER_STATUSES = new Set(["playing"]);

export type RoundCommandResult = {
  accepted: boolean;
  error?: string;
  idempotent?: boolean;
  acknowledge?: boolean;
};

function rejectReasonForRoundStatus(status: string): string | null {
  if (status === ACTIVE_STATUS) return null;
  if (status === PAUSED_STATUS) return "ROUND_PAUSED";
  if (LATE_STATUSES.has(status)) return "LATE_INPUT";
  return "ROUND_NOT_ACTIVE";
}

function hasActionNonce(payload: Record<string, unknown>): string | null {
  if (typeof payload.actionNonce !== "string") return null;
  const nonce = payload.actionNonce.trim();
  return nonce.length > 0 ? nonce : null;
}

function nonceKey(participationId: string, nonce: string): string {
  return `${participationId}::${nonce}`;
}

/**
 * Synchronous validation of round commands (role, phase, admission, deadline, nonce format).
 * Does not persist — call {@link persistAcceptedRoundInput} after accept.
 */
export function evaluateRoundCommand(
  state: LiveRoomState,
  client: Client,
  command: CommandMessage,
  nowMs: number = Date.now(),
): RoundCommandResult {
  const player = state.players.get(client.sessionId);
  if (!player) return { accepted: false, error: "NOT_IN_ROOM" };

  if (!canSubmitPlayerCommand(player.role)) {
    return { accepted: false, error: "ROLE_NOT_ALLOWED" };
  }

  const roundStatusError = rejectReasonForRoundStatus(state.currentRoundStatus);
  if (roundStatusError) {
    return { accepted: false, error: roundStatusError };
  }

  if (
    state.roundDeadlineAt > 0 &&
    nowMs > state.roundDeadlineAt
  ) {
    return { accepted: false, error: "LATE_INPUT" };
  }

  if (!ADMITTED_PLAYER_STATUSES.has(player.status)) {
    return { accepted: false, error: "ROUND_PARTICIPANT_NOT_ADMITTED" };
  }

  const nonce = hasActionNonce(command.payload);
  if (!nonce) {
    return { accepted: false, error: "ACTION_NONCE_REQUIRED" };
  }

  const key = nonceKey(player.participationId, nonce);
  if (state.acceptedActionNonces.has(key)) {
    // Idempotent: same nonce already accepted — do not re-apply side effects.
    return { accepted: true, idempotent: true, acknowledge: true };
  }

  return { accepted: true, acknowledge: true };
}

/**
 * Apply accepted side effects (finish) and remember nonce in-memory.
 */
export function applyAcceptedRoundCommand(
  state: LiveRoomState,
  client: Client,
  command: CommandMessage,
): void {
  const player = state.players.get(client.sessionId);
  if (!player) return;

  const nonce = hasActionNonce(command.payload);
  if (!nonce) return;

  const key = nonceKey(player.participationId, nonce);
  state.acceptedActionNonces.add(key);

  if (command.type === "round:finish") {
    player.status = "finished_round";
  }
}

/**
 * Persist accepted input. Duplicate nonce at DB level is treated as idempotent success.
 */
export async function persistAcceptedRoundInput(
  state: LiveRoomState,
  client: Client,
  command: CommandMessage,
): Promise<RoundCommandResult> {
  const player = state.players.get(client.sessionId);
  if (!player) return { accepted: false, error: "NOT_IN_ROOM" };

  const nonce = hasActionNonce(command.payload);
  if (!nonce) return { accepted: false, error: "ACTION_NONCE_REQUIRED" };

  if (!state.currentRoundId) {
    // Room may be social-only without a configured round — still accept in-memory.
    return { accepted: true, acknowledge: true };
  }

  const existing = await roundRepository
    .findPlayerActionByNonce(state.currentRoundId, player.participationId, nonce)
    .catch(() => null);

  if (existing) {
    state.acceptedActionNonces.add(nonceKey(player.participationId, nonce));
    return { accepted: true, idempotent: true, acknowledge: true };
  }

  try {
    await roundRepository.createPlayerAction({
      roundId: state.currentRoundId,
      participationId: player.participationId,
      actionType: command.type,
      actionNonce: nonce,
      payload: command.payload,
      accepted: true,
    });
    return { accepted: true, acknowledge: true };
  } catch {
    // Unique constraint race → idempotent.
    const again = await roundRepository
      .findPlayerActionByNonce(state.currentRoundId, player.participationId, nonce)
      .catch(() => null);
    if (again) {
      return { accepted: true, idempotent: true, acknowledge: true };
    }
    return {
      accepted: false,
      error: "INPUT_PERSISTENCE_FAILED",
    };
  }
}

/**
 * Full round command path: validate → persist → apply side effects.
 */
export async function handleRoundCommandAsync(
  state: LiveRoomState,
  client: Client,
  command: CommandMessage,
  nowMs: number = Date.now(),
): Promise<RoundCommandResult> {
  const evaluation = evaluateRoundCommand(state, client, command, nowMs);
  if (!evaluation.accepted) return evaluation;

  if (evaluation.idempotent) {
    return evaluation;
  }

  const persisted = await persistAcceptedRoundInput(state, client, command);
  if (!persisted.accepted) return persisted;

  if (!persisted.idempotent) {
    applyAcceptedRoundCommand(state, client, command);
  }

  return persisted;
}

/**
 * Sync path for unit tests / dispatcher — validates and applies in-memory only.
 * Production message path uses {@link handleRoundCommandAsync}.
 */
function handleRoundCommand(
  state: LiveRoomState,
  client: Client,
  command: CommandMessage,
): RoundCommandResult {
  const evaluation = evaluateRoundCommand(state, client, command);
  if (!evaluation.accepted || evaluation.idempotent) {
    return evaluation;
  }
  applyAcceptedRoundCommand(state, client, command);
  return { accepted: true, acknowledge: true };
}

export function registerRoundHandlers(): void {
  registerCommandHandler("round:submit", handleRoundCommand);
  registerCommandHandler("round:finish", handleRoundCommand);
}
