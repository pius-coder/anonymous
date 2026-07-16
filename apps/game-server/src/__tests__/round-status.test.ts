import { describe, expect, it } from "vitest";
import { mapDbRoundStatusToRoom, pickCurrentRound } from "../rooms/round-status.js";

describe("round-status mapping", () => {
  it("maps DB lifecycle statuses to room statuses", () => {
    expect(mapDbRoundStatusToRoom("ACTIVE")).toBe("active");
    expect(mapDbRoundStatusToRoom("SUSPENDED")).toBe("paused");
    expect(mapDbRoundStatusToRoom("VERIFICATION")).toBe("verification");
    expect(mapDbRoundStatusToRoom("BRIEFING")).toBe("waiting");
    expect(mapDbRoundStatusToRoom(undefined)).toBe("waiting");
  });

  it("picks the highest-number live round over older ones", () => {
    const current = pickCurrentRound([
      { id: "r1", status: "CLOSED", number: 1 },
      { id: "r2", status: "ACTIVE", number: 2 },
      { id: "r3", status: "BRIEFING", number: 3 },
    ]);
    // BRIEFING is live and has higher number
    expect(current?.id).toBe("r3");
  });

  it("falls back to highest number when no live status", () => {
    const current = pickCurrentRound([
      { id: "r1", status: "CLOSED", number: 1 },
      { id: "r2", status: "COMPLETED", number: 4 },
    ]);
    expect(current?.id).toBe("r2");
  });
});
