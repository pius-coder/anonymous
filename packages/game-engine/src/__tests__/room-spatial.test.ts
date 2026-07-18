import { describe, expect, it } from "vitest";
import {
  ROOM_PLAYER_SPEED,
  ROOM_SPAWNS,
  ROOM_TILE_SIZE,
  canOccupyRoomPosition,
  isRoomTileBlocked,
  resolveRoomMovement,
} from "../spatial/index.js";

describe("social room spatial rules", () => {
  it("keeps spawns in walkable tiles", () => {
    expect(ROOM_SPAWNS.every((spawn) => canOccupyRoomPosition(spawn.x, spawn.y))).toBe(true);
  });

  it("normalizes diagonal movement", () => {
    const start = ROOM_SPAWNS[0];
    const next = resolveRoomMovement(start, { x: 1, y: 1 }, 1_000);
    expect(Math.hypot(next.x - start.x, next.y - start.y)).toBeCloseTo(ROOM_PLAYER_SPEED * 0.1, 5);
  });

  it("blocks world walls and slides along them", () => {
    const start = { x: ROOM_TILE_SIZE * 1.5, y: ROOM_TILE_SIZE * 2 };
    expect(isRoomTileBlocked(0, 2)).toBe(true);
    const next = resolveRoomMovement(start, { x: -1, y: 1 }, 100);
    expect(next.x).toBe(start.x);
    expect(next.y).toBeGreaterThan(start.y);
  });

  it("blocks central stage tiles", () => {
    expect(isRoomTileBlocked(28, 18)).toBe(true);
    expect(canOccupyRoomPosition(28.5 * ROOM_TILE_SIZE, 18.5 * ROOM_TILE_SIZE)).toBe(false);
  });
});
