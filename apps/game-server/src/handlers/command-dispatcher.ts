import type { Client } from "colyseus";
import type { LiveRoomState } from "../rooms/schema/LiveRoomState.js";
import { canSubmitPlayerCommand } from "../auth/live-roles.js";

export type CommandMessage = {
  type: string;
  payload: Record<string, unknown>;
};

export type CommandHandler = (
  state: LiveRoomState,
  client: Client,
  command: CommandMessage,
) => { accepted: boolean; error?: string; acknowledge?: boolean };

const handlers = new Map<string, CommandHandler>();

export function registerCommandHandler(type: string, handler: CommandHandler): void {
  handlers.set(type, handler);
}

export function isCompetitiveCommandType(type: string): boolean {
  return type !== "snapshot:request";
}

export function dispatchCommand(
  state: LiveRoomState,
  client: Client,
  command: CommandMessage,
): { accepted: boolean; error?: string; acknowledge?: boolean } {
  const handler = handlers.get(command.type);
  if (!handler) {
    return { accepted: false, error: "UNKNOWN_COMMAND" };
  }

  const player = state.players.get(client.sessionId);
  if (!player) {
    return { accepted: false, error: "NOT_IN_ROOM" };
  }

  if (!player.connected) {
    return { accepted: false, error: "PLAYER_DISCONNECTED" };
  }

  if (!canSubmitPlayerCommand(player.role) && isCompetitiveCommandType(command.type)) {
    return { accepted: false, error: "ROLE_NOT_ALLOWED" };
  }

  return handler(state, client, command);
}
