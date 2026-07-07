import { describe, it, expect } from "vitest";
import { GameState, Player } from "../rooms/schema/GameState.js";

describe("GameState", () => {
  it("should create a GameState with empty players", () => {
    const state = new GameState();
    expect(state.players).toBeDefined();
    expect(state.players.size).toBe(0);
  });

  it("should add a player to the state", () => {
    const state = new GameState();
    const player = new Player();
    player.name = "Alice";
    state.players.set("session-1", player);
    expect(state.players.size).toBe(1);
    expect(state.players.get("session-1")?.name).toBe("Alice");
  });

  it("should remove a player from the state", () => {
    const state = new GameState();
    const player = new Player();
    state.players.set("session-1", player);
    state.players.delete("session-1");
    expect(state.players.size).toBe(0);
  });

  it("should handle multiple players", () => {
    const state = new GameState();
    for (let i = 0; i < 4; i++) {
      const player = new Player();
      player.name = `Player ${i}`;
      state.players.set(`session-${i}`, player);
    }
    expect(state.players.size).toBe(4);
  });
});

describe("Player", () => {
  it("should create a player with default values", () => {
    const player = new Player();
    expect(player.name).toBe("");
    expect(player.x).toBe(0);
    expect(player.y).toBe(0);
  });

  it("should set player properties", () => {
    const player = new Player();
    player.name = "Bob";
    player.x = 100;
    player.y = 200;
    expect(player.name).toBe("Bob");
    expect(player.x).toBe(100);
    expect(player.y).toBe(200);
  });
});
