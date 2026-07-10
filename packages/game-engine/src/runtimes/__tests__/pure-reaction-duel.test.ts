import { describe, expect, it } from "vitest";
import { hashResolution } from "../../index.js";
import { pureReactionDuelRuntime } from "../pure-reaction-duel.js";
import type { RuntimeResolverInput } from "../types.js";

function baseInput(overrides: Partial<RuntimeResolverInput> = {}): RuntimeResolverInput {
  return {
    roundId: "round-1",
    participants: ["p1", "p2"],
    config: { roundsToWin: 2, falseStartPenaltyMs: 1000, signalDelayRangeMs: [2000, 6000] },
    seed: "duel-seed-99",
    actions: [],
    ...overrides,
  };
}

describe("pure-reaction-duel runtime", () => {
  it("has key pure-reaction-duel", () => {
    expect(pureReactionDuelRuntime.key).toBe("pure-reaction-duel");
  });

  it("throws if fewer than two participants", () => {
    expect(() =>
      pureReactionDuelRuntime.resolve({ ...baseInput(), participants: ["p1"] }),
    ).toThrow("pure-reaction-duel requires at least two participants");
  });

  it("supports group reaction ranking inside a shared live session", () => {
    const result = pureReactionDuelRuntime.resolve(
      baseInput({
        participants: ["p1", "p2", "p3", "p4"],
        config: { signalDelayRangeMs: [2000, 2000], falseStartPenaltyMs: 1000 },
        actions: [
          { playerId: "p1", actionNonce: "n1", submittedAt: "2026-07-09T00:00:03Z", payload: { clickedAtMs: 2300 } },
          { playerId: "p2", actionNonce: "n2", submittedAt: "2026-07-09T00:00:03Z", payload: { clickedAtMs: 2200 } },
          { playerId: "p3", actionNonce: "n3", submittedAt: "2026-07-09T00:00:03Z", payload: { clickedAtMs: 2400 } },
        ],
      }),
    );
    expect(result.qualifiedIds).toHaveLength(2);
    expect(result.eliminatedIds).toHaveLength(2);
    expect(result.evidence[0].type).toBe("runtime.pure-reaction-duel.group");
  });

  it("produces deterministic output from same seed and actions", () => {
    const input = baseInput({
      actions: [
        { playerId: "p1", actionNonce: "n1", submittedAt: "2026-07-09T00:00:03Z", payload: { roundIndex: 0, clickedAtMs: 3000 } },
        { playerId: "p2", actionNonce: "n2", submittedAt: "2026-07-09T00:00:03.5Z", payload: { roundIndex: 0, clickedAtMs: 3500 } },
      ],
    });

    const first = pureReactionDuelRuntime.resolve(input);
    const second = pureReactionDuelRuntime.resolve(input);

    expect(hashResolution(first)).toBe(hashResolution(second));
  });

  it("detects false start (click before signal)", () => {
    const noActionResult = pureReactionDuelRuntime.resolve(baseInput());
    const signalTimings = noActionResult.seedLog[0].data?.signalTimings as number[];
    const firstSignalMs = signalTimings[0];

    const input = baseInput({
      actions: [
        { playerId: "p1", actionNonce: "n1", submittedAt: "2026-07-09T00:00:00.5Z", payload: { roundIndex: 0, clickedAtMs: firstSignalMs - 100 } },
        { playerId: "p2", actionNonce: "n2", submittedAt: "2026-07-09T00:00:03Z", payload: { roundIndex: 0, clickedAtMs: firstSignalMs + 1000 } },
      ],
    });

    const result = pureReactionDuelRuntime.resolve(input);
    const hasFalseStartEvidence = result.evidence.some((e) => e.type === "false-start");
    expect(hasFalseStartEvidence).toBe(true);
  });

  it("produces exactly one qualified and one eliminated", () => {
    const result = pureReactionDuelRuntime.resolve(baseInput());
    expect(result.qualifiedIds.length).toBe(1);
    expect(result.eliminatedIds.length).toBe(1);
    expect(result.qualifiedIds[0]).not.toBe(result.eliminatedIds[0]);
  });

  it("produces valid ResolverOutput structure", () => {
    const result = pureReactionDuelRuntime.resolve(baseInput());
    expect(result).toHaveProperty("resolverId");
    expect(result).toHaveProperty("scores");
    expect(result).toHaveProperty("qualifiedIds");
    expect(result).toHaveProperty("seedLog");
    expect(result.seedLog.length).toBeGreaterThan(0);
  });
});
