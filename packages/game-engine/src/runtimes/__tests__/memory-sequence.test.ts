import { describe, expect, it } from "vitest";
import { hashResolution } from "../../index.js";
import { memorySequenceRuntime } from "../memory-sequence.js";
import type { RuntimeResolverInput } from "../types.js";

function baseInput(overrides: Partial<RuntimeResolverInput> = {}): RuntimeResolverInput {
  return {
    roundId: "round-1",
    participants: ["p1", "p2", "p3"],
    config: { initialLength: 3, increment: 1, maxRounds: 5, winnersCount: 2, displaySpeedMs: 600 },
    seed: "test-seed-abc",
    actions: [],
    ...overrides,
  };
}

describe("memory-sequence runtime", () => {
  it("has key memory-sequence", () => {
    expect(memorySequenceRuntime.key).toBe("memory-sequence");
  });

  it("produces deterministic output from same seed and actions", () => {
    const input = baseInput({
      actions: [
        { playerId: "p1", actionNonce: "n1", submittedAt: "2026-07-09T00:00:01Z", payload: { roundIndex: 0, reproduction: [0, 1, 2] } },
        { playerId: "p2", actionNonce: "n2", submittedAt: "2026-07-09T00:00:02Z", payload: { roundIndex: 0, reproduction: [0, 1, 3] } },
      ],
    });

    const first = memorySequenceRuntime.resolve(input);
    const second = memorySequenceRuntime.resolve(input);

    expect(hashResolution(first)).toBe(hashResolution(second));
    expect(first.scores).toEqual(second.scores);
    expect(first.qualifiedIds).toEqual(second.qualifiedIds);
    expect(first.eliminatedIds).toEqual(second.eliminatedIds);
  });

  it("scores correct reproductions and rejects wrong ones", () => {
    const inputNoActions = baseInput();
    const resultNoActions = memorySequenceRuntime.resolve(inputNoActions);
    const fullSequence = resultNoActions.seedLog[0].data?.fullSequence as number[][];

    const input = baseInput({
      actions: [
        { playerId: "p1", actionNonce: "n1", submittedAt: "2026-07-09T00:00:01Z", payload: { roundIndex: 0, reproduction: fullSequence[0] } },
        { playerId: "p2", actionNonce: "n2", submittedAt: "2026-07-09T00:00:02Z", payload: { roundIndex: 0, reproduction: fullSequence[0].map((v: number) => v + 1) } },
      ],
    });

    const result = memorySequenceRuntime.resolve(input);
    const p1 = result.ranking.find((e) => e.playerId === "p1");
    const p2 = result.ranking.find((e) => e.playerId === "p2");
    expect(p1!.score).toBeGreaterThan(p2!.score);
  });

  it("gives score 0 to players with no actions", () => {
    const result = memorySequenceRuntime.resolve(baseInput());
    for (const entry of result.ranking) {
      if (entry.missingAction) {
        expect(entry.score).toBe(0);
      }
    }
  });

  it("does not leak sequence in scores or ranks", () => {
    const result = memorySequenceRuntime.resolve(baseInput());
    const serialized = JSON.stringify(result.scores);
    const ranksSerialized = JSON.stringify(result.ranks);
    expect(typeof result.scores).toBe("object");
    expect(typeof result.ranks).toBe("object");
    expect(serialized).not.toContain("seed");
    expect(ranksSerialized).not.toContain("seed");
  });

  it("produces valid ResolverOutput structure", () => {
    const result = memorySequenceRuntime.resolve(baseInput());
    expect(result).toHaveProperty("resolverId");
    expect(result).toHaveProperty("scores");
    expect(result).toHaveProperty("ranks");
    expect(result).toHaveProperty("qualifiedIds");
    expect(result).toHaveProperty("eliminatedIds");
    expect(result).toHaveProperty("ranking");
    expect(result).toHaveProperty("seedLog");
    expect(Array.isArray(result.seedLog)).toBe(true);
    expect(result.seedLog.length).toBeGreaterThan(0);
  });
});
