import type { Client } from "colyseus";
import type { LiveRoomState } from "../rooms/schema/LiveRoomState.js";
import type { CommandMessage } from "./command-dispatcher.js";
import { registerCommandHandler } from "./command-dispatcher.js";
import { canSubmitPlayerCommand } from "../auth/live-roles.js";

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

  if (state.currentRoundStatus !== "active" && command.type === "round:submit") {
    return { accepted: false, error: "ROUND_NOT_ACTIVE" };
  }

  return { accepted: true };
}

export function registerRoundHandlers(): void {
  registerCommandHandler("round:submit", handleRoundCommand);
}
