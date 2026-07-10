import { describe, expect, it } from "vitest";
import { LiveGroup, LivePlayer, LiveRoomState } from "../rooms/schema/LiveState.js";

describe("LiveRoomState", () => {
  it("starts with minimal live session defaults", () => {
    const state = new LiveRoomState();

    expect(state.phase).toBe("BRIEFING");
    expect(state.players.size).toBe(0);
    expect(state.groups.size).toBe(0);
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

  it("synchronizes public social groups without private requests", () => {
    const state = new LiveRoomState();
    const leader = new LivePlayer();
    leader.userId = "player-1";
    leader.socialGroupId = "group-1";
    leader.socialRole = "LEADER";
    state.players.set(leader.userId, leader);

    const group = new LiveGroup();
    group.id = "group-1";
    group.name = "Les Survivants";
    group.leaderId = leader.userId;
    group.memberIds.push(leader.userId);
    group.maxMembers = 4;
    state.groups.set(group.id, group);

    expect(Array.from(state.groups.get("group-1")?.memberIds ?? [])).toEqual(["player-1"]);
    expect(state.players.get("player-1")?.socialRole).toBe("LEADER");
    expect("requests" in state).toBe(false);
  });

});
