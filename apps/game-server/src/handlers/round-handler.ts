import type { Client } from "colyseus";
import type { LiveRoomState } from "../rooms/schema/LiveRoomState.js";
import type { CommandMessage } from "./command-dispatcher.js";
import { registerCommandHandler } from "./command-dispatcher.js";
import { canSubmitPlayerCommand } from "../auth/live-roles.js";

const ACTIVE_STATUS = "active";
const PAUSED_STATUS = "paused";
const LATE_STATUSES = new Set(["closing", "closed", "verification", "waiting_review"]);
const ADMITTED_PLAYER_STATUSES = new Set(["playing"]);

function rejectReasonForRoundStatus(status: string): string | null {
  if (status === ACTIVE_STATUS) return null;
  if (status === PAUSED_STATUS) return "ROUND_PAUSED";
  if (LATE_STATUSES.has(status)) return "LATE_INPUT";
  return "ROUND_NOT_ACTIVE";
}

function handleRoundCommand(
  state: LiveRoomState,
  client: Client,
  command: CommandMessage,
): { accepted: boolean; error?: string } {
  const player = state.players.get(client.sessionId);
  if (!player) return { accepted: false, error: "NOT_IN_ROOM" };

  if (!canSubmitPlayerCommand(player.role)) {
    return { accepted: false, error: "ROLE_NOT_ALLOWED" };
  }

  const roundStatusError = rejectReasonForRoundStatus(state.currentRoundStatus);
  if (roundStatusError) {
    return { accepted: false, error: roundStatusError };
  }

  if (!ADMITTED_PLAYER_STATUSES.has(player.status)) {
    return { accepted: false, error: "ROUND_PARTICIPANT_NOT_ADMITTED" };
  }

  if (!hasActionNonce(command.payload)) {
    return { accepted: false, error: "ACTION_NONCE_REQUIRED" };
  }

  if (command.type === "round:finish") {
    player.status = "finished_round";
  }

  return { accepted: true };
}

export function registerRoundHandlers(): void {
  registerCommandHandler("round:submit", handleRoundCommand);
  registerCommandHandler("round:finish", handleRoundCommand);
}

function hasActionNonce(payload: Record<string, unknown>): boolean {
  return typeof payload.actionNonce === "string" && payload.actionNonce.trim().length > 0;
}
