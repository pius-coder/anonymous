import { describe, expect, it } from "vitest";
import {
  GAME_ENGINE_VERSION,
  applyWinnersCount,
  hashResolution,
  rankPlayers,
  resolveDuelScoreRound,
  resolveRound,
  getRuntime,
  resolveSoloScoreRound,
  stableStringify,
  type ResolverInput,
} from "../index.js";

function soloInput(overrides: Partial<ResolverInput> = {}): ResolverInput {
  return {
    roundId: "round-1",
    participants: ["p1", "p2", "p3"],
    config: { family: "solo-score", winnersCount: 2 },
    actions: [
      {
        playerId: "p1",
        actionNonce: "n1",
        submittedAt: "2026-07-08T00:00:01Z",
        payload: { score: 10, tieBreakMs: 120 },
      },
      {
        playerId: "p2",
        actionNonce: "n2",
        submittedAt: "2026-07-08T00:00:02Z",
        payload: { score: 10, tieBreakMs: 90 },
      },
    ],
    ...overrides,
  };
}

describe("game-engine", () => {
  it("exports a semver version", () => {
    expect(GAME_ENGINE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("ranks by score, tie-break, then deterministic player id", () => {
    const result = rankPlayers([
      { playerId: "b", score: 10, tieBreakMs: null, missingAction: false },
      { playerId: "a", score: 10, tieBreakMs: null, missingAction: false },
      { playerId: "c", score: 8, tieBreakMs: 10, missingAction: false },
    ]);

    expect(result.ranking.map((entry) => entry.playerId)).toEqual(["a", "b", "c"]);
    expect(result.tieGroups).toEqual([["a", "b"]]);
  });

  it("applies winners count without exceeding participant count", () => {
    const ranking = rankPlayers([
      { playerId: "p1", score: 3, tieBreakMs: null, missingAction: false },
      { playerId: "p2", score: 2, tieBreakMs: null, missingAction: false },
    ]).ranking;

    expect(applyWinnersCount(ranking, 5)).toEqual({
      qualifiedIds: ["p1", "p2"],
      eliminatedIds: [],
    });
  });

  it("resolves solo fixtures deterministically with missing action evidence", () => {
    const first = resolveSoloScoreRound(soloInput());
    const second = resolveSoloScoreRound(soloInput());

    expect(first.qualifiedIds).toEqual(["p2", "p1"]);
    expect(first.eliminatedIds).toEqual(["p3"]);
    expect(first.scores.p3).toBe(0);
    expect(first.evidence.some((entry) => entry.type === "action.missing")).toBe(true);
    expect(hashResolution(first)).toBe(hashResolution(second));
  });

  it("resolves duel fixtures with one winner", () => {
    const result = resolveDuelScoreRound({
      ...soloInput({
        participants: ["p1", "p2"],
        config: { family: "duel-score", winnersCount: 2 },
      }),
    });

    expect(result.qualifiedIds).toEqual(["p2"]);
    expect(result.eliminatedIds).toEqual(["p1"]);
  });

  it("rejects duel inputs that do not have exactly two participants", () => {
    expect(() => resolveDuelScoreRound(soloInput())).toThrow(
      "duel-score resolver requires exactly two participants",
    );
  });

  it("dispatches through resolveRound", () => {
    expect(resolveRound(soloInput()).resolverId).toBe("solo-score");
  });

  it("registers all six recette live runtimes", () => {
    expect(["memory-sequence", "pure-reaction-duel", "trust-bridge", "team-relay", "danger-sweep", "silent-vote"].map((key) => getRuntime(key)?.key)).toEqual([
      "memory-sequence",
      "pure-reaction-duel",
      "trust-bridge",
      "team-relay",
      "danger-sweep",
      "silent-vote",
    ]);
  });

  it("resolves trust bridge from pair agreement", () => {
    const result = getRuntime("trust-bridge")?.resolve({
      roundId: "round-trust",
      participants: ["p1", "p2", "p3"],
      seed: "seed",
      config: { winnersCount: 2 },
      actions: [
        { playerId: "p1", actionNonce: "a1", submittedAt: "2026-07-08T00:00:01Z", payload: { routeId: "alpha" } },
        { playerId: "p2", actionNonce: "a2", submittedAt: "2026-07-08T00:00:02Z", payload: { routeId: "alpha" } },
        { playerId: "p3", actionNonce: "a3", submittedAt: "2026-07-08T00:00:03Z", payload: { routeId: "beta" } },
      ],
    });

    expect(result?.qualifiedIds).toEqual(["p1", "p2"]);
    expect(result?.eliminatedIds).toEqual(["p3"]);
  });

  it("resolves team relay from ordered server actions", () => {
    const result = getRuntime("team-relay")?.resolve({
      roundId: "round-team",
      participants: ["p1", "p2", "p3", "p4"],
      seed: "seed",
      config: { winnersCount: 2 },
      actions: [
        { playerId: "p1", actionNonce: "a1", submittedAt: "2026-07-08T00:00:01Z", payload: { stepId: "scan" } },
        { playerId: "p3", actionNonce: "a2", submittedAt: "2026-07-08T00:00:02Z", payload: { stepId: "align" } },
        { playerId: "p1", actionNonce: "a3", submittedAt: "2026-07-08T00:00:03Z", payload: { stepId: "lock" } },
        { playerId: "p3", actionNonce: "a4", submittedAt: "2026-07-08T00:00:04Z", payload: { stepId: "release" } },
      ],
    });

    expect(result?.qualifiedIds).toEqual(["p1", "p3"]);
    expect(result?.eliminatedIds).toEqual(["p2", "p4"]);
  });

  it("resolves danger sweep by recomputing collision server-side", () => {
    const result = getRuntime("danger-sweep")?.resolve({
      roundId: "round-sweep",
      participants: ["safe", "hit"],
      seed: "seed",
      config: { winnersCount: 1, sweepT0EpochMs: 0, speed: 180, width: 72 },
      actions: [
        { playerId: "safe", actionNonce: "a1", submittedAt: "1970-01-01T00:00:01.000Z", payload: { x: 400, y: 200 } },
        { playerId: "hit", actionNonce: "a2", submittedAt: "1970-01-01T00:00:01.000Z", payload: { x: 190, y: 200 } },
      ],
    });

    expect(result?.qualifiedIds).toEqual(["safe"]);
    expect(result?.eliminatedIds).toEqual(["hit"]);
  });

  it("resolves silent vote by eliminating the majority target", () => {
    const result = getRuntime("silent-vote")?.resolve({
      roundId: "round-vote",
      participants: ["p1", "p2", "p3"],
      seed: "seed",
      config: {},
      actions: [
        { playerId: "p1", actionNonce: "a1", submittedAt: "2026-07-08T00:00:01Z", payload: { targetUserId: "p3" } },
        { playerId: "p2", actionNonce: "a2", submittedAt: "2026-07-08T00:00:02Z", payload: { targetUserId: "p3" } },
        { playerId: "p3", actionNonce: "a3", submittedAt: "2026-07-08T00:00:03Z", payload: { targetUserId: "p2" } },
      ],
    });

    expect(result?.qualifiedIds).toEqual(["p1", "p2"]);
    expect(result?.eliminatedIds).toEqual(["p3"]);
  });

  it("stableStringify ignores object key order for replay hashing", () => {
    expect(stableStringify({ b: 2, a: 1 })).toBe(stableStringify({ a: 1, b: 2 }));
  });
});
