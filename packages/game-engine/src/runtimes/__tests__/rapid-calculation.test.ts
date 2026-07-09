import { describe, expect, it } from "vitest";
import { hashResolution } from "../../index.js";
import { rapidCalculationRuntime } from "../rapid-calculation.js";
import type { RuntimeResolverInput } from "../types.js";

function baseInput(overrides: Partial<RuntimeResolverInput> = {}): RuntimeResolverInput {
  return {
    roundId: "round-1",
    participants: ["p1", "p2"],
    config: { difficultyMin: 10, difficultyMax: 20, winnersCount: 1, questionDelayMs: 5000 },
    seed: "calc-seed-42",
    actions: [],
    ...overrides,
  };
}

describe("rapid-calculation runtime", () => {
  it("has key rapid-calculation", () => {
    expect(rapidCalculationRuntime.key).toBe("rapid-calculation");
  });

  it("produces deterministic output from same seed and actions", () => {
    const input = baseInput({
      actions: [
        { playerId: "p1", actionNonce: "n1", submittedAt: "2026-07-09T00:00:01Z", payload: { questionIndex: 0, answer: 42, answeredAtMs: 3000 } },
      ],
    });

    const first = rapidCalculationRuntime.resolve(input);
    const second = rapidCalculationRuntime.resolve(input);

    expect(hashResolution(first)).toBe(hashResolution(second));
  });

  it("gives score 0 to players with no actions", () => {
    const result = rapidCalculationRuntime.resolve(baseInput());
    for (const entry of result.ranking) {
      if (entry.missingAction) {
        expect(entry.score).toBe(0);
      }
    }
  });

  it("produces valid ResolverOutput structure", () => {
    const result = rapidCalculationRuntime.resolve(baseInput());
    expect(result).toHaveProperty("resolverId");
    expect(result).toHaveProperty("scores");
    expect(result).toHaveProperty("qualifiedIds");
    expect(result).toHaveProperty("seedLog");
    expect(result.seedLog.length).toBeGreaterThan(0);
  });

  it("does not leak seed directly in scores", () => {
    const result = rapidCalculationRuntime.resolve(baseInput());
    const serialized = JSON.stringify(result.scores);
    expect(serialized).not.toContain("calc-seed-42");
  });
});
