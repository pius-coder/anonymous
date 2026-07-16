import {
  resolveRoomMovement,
  type RoomMovementInput,
} from "@session-jeu/game-engine";
import { registerCommandHandler } from "./command-dispatcher.js";
import type { LiveRoomState, PlayerState } from "../rooms/schema/LiveRoomState.js";

export const ROOM_MOVEMENT_COMMAND = "room:move";

export function registerMovementHandler(): void {
  registerCommandHandler(ROOM_MOVEMENT_COMMAND, (state, client, command) => {
    const player = state.players.get(client.sessionId);
    if (!player) return { accepted: false, error: "NOT_IN_ROOM" };

    const parsed = parseMovement(command.payload);
    if (!parsed) return { accepted: false, error: "INVALID_MOVEMENT_INPUT" };
    if (parsed.sequence <= player.lastProcessedInputSequence ||
        parsed.sequence <= (player.pendingInput?.sequence ?? 0)) {
      return { accepted: false, error: "STALE_MOVEMENT_INPUT" };
    }

    player.pendingInput = parsed;
    return { accepted: true, acknowledge: false };
  });
}

export function applyMovementTick(state: LiveRoomState, deltaMs: number): void {
  for (const player of state.players.values()) {
    if (!player.connected) continue;
    const input = player.pendingInput;
    if (!input) {
      player.moving = false;
      continue;
    }

    const next = resolveRoomMovement(player, input, deltaMs);
    player.x = next.x;
    player.y = next.y;
    player.moving = input.x !== 0 || input.y !== 0;
    player.facing = facingFor(input, player.facing);
    player.lastProcessedInputSequence = input.sequence;
    player.pendingInput = undefined;
  }
}

function parseMovement(payload: Record<string, unknown>):
  { sequence: number; x: number; y: number } | undefined {
  const { sequence, x, y } = payload;
  if (!Number.isSafeInteger(sequence) || typeof x !== "number" || typeof y !== "number") {
    return undefined;
  }
  if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > 1 || Math.abs(y) > 1) {
    return undefined;
  }
  return { sequence: sequence as number, x, y };
}

function facingFor(input: RoomMovementInput, fallback: string): string {
  if (Math.abs(input.x) > Math.abs(input.y)) return input.x < 0 ? "left" : "right";
  if (input.y !== 0) return input.y < 0 ? "up" : "down";
  return fallback;
}

export function setPlayerInput(
  player: PlayerState,
  input: { sequence: number; x: number; y: number },
): void {
  player.pendingInput = input;
}
