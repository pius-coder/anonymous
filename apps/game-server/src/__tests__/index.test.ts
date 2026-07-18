import { describe, expect, it } from "vitest";
import { validateLiveToken } from "../auth/live-auth.js";
import { getAdminSnapshot, getReadonlySnapshot } from "../handlers/readonly-handler.js";
import { LiveRoomState } from "../rooms/schema/LiveRoomState.js";

describe("game-server foundation", () => {
  it("exports validateLiveToken function", () => {
    expect(validateLiveToken).toBeDefined();
    expect(typeof validateLiveToken).toBe("function");
  });

  it("getAdminSnapshot returns correct shape", () => {
    const state = new LiveRoomState();
    state.partyId = "party-1";
    state.partyStatus = "ROUND_ACTIVE";
    state.connectedCount = 0;

    const snap = getAdminSnapshot(state);
    expect(snap.partyId).toBe("party-1");
    expect(snap.partyStatus).toBe("ROUND_ACTIVE");
    expect(snap.connectedCount).toBe(0);
    expect(Array.isArray(snap.players)).toBe(true);
  });

  it("getReadonlySnapshot returns filtered shape", () => {
    const state = new LiveRoomState();
    state.partyId = "party-1";
    state.currentRoundNumber = 1;
    state.connectedCount = 0;

    const snap = getReadonlySnapshot(state);
    expect(snap.partyId).toBe("party-1");
    expect(snap.currentRoundNumber).toBe(1);
    expect(snap.playerCount).toBe(0);
    expect(Object.hasOwn(snap, "players")).toBe(false);
  });
});
