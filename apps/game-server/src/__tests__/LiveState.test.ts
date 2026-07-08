import { describe, expect, it } from "vitest";
import { LivePlayer, LiveRoomState } from "../rooms/schema/LiveState.js";

describe("LiveRoomState", () => {
  it("starts with minimal live session defaults", () => {
    const state = new LiveRoomState();

    expect(state.phase).toBe("BRIEFING");
    expect(state.players.size).toBe(0);
    expect(state.deadlineEpochMs).toBe(0);
  });

  it("tracks synchronized player connection and submission state only", () => {
    const state = new LiveRoomState();
    const player = new LivePlayer();
    player.userId = "player-1";
    player.displayName = "Alice";
    player.connectionStatus = "CONNECTED";
    player.submittedAction = true;

    state.players.set("player-1", player);

    expect(state.players.get("player-1")?.displayName).toBe("Alice");
    expect(state.players.get("player-1")?.submittedAction).toBe(true);
  });

  it("stores official round deadline timestamp for client countdown display", () => {
    const state = new LiveRoomState();
    state.currentRoundId = "round-1";
    state.roundNum = 1;
    state.phase = "ROUND_ACTIVE";
    state.deadlineEpochMs = new Date("2026-07-08T00:00:30Z").getTime();

    expect(state.phase).toBe("ROUND_ACTIVE");
    expect(state.deadlineEpochMs).toBe(1783468830000);
  });
});
