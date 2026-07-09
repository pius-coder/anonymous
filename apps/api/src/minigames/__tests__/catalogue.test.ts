import { describe, expect, it } from "vitest";
import {
  MVP_MINIGAME_DEFINITIONS,
  validateMiniGameAction,
  validateMiniGameConfig,
} from "../catalogue.js";

describe("mini-game catalogue", () => {
  it("defines the five MVP mini-games with resolvers and action policies", () => {
    expect(MVP_MINIGAME_DEFINITIONS).toHaveLength(5);
    expect(MVP_MINIGAME_DEFINITIONS.map((definition) => definition.key)).toEqual([
      "memory-sequence",
      "rapid-calculation",
      "pure-reaction-duel",
      "target-precision",
      "safe-zones",
    ]);

    for (const definition of MVP_MINIGAME_DEFINITIONS) {
      expect(["solo-score", "duel-score"]).toContain(definition.resolverId);
      expect(definition.version).toBe(1);
      expect(definition.allowedActions.length).toBeGreaterThan(0);
      expect(definition.configSchema).toHaveProperty("type", "object");
    }
  });

  it("validates per-mini-game configuration", () => {
    expect(
      validateMiniGameConfig({
        key: "memory-sequence",
        config: { durationSeconds: 60, winnersCount: 3, maxAttempts: 20 },
      }),
    ).toMatchObject({ type: "ok" });

    expect(
      validateMiniGameConfig({
        key: "memory-sequence",
        config: { durationSeconds: 5, winnersCount: 3, maxAttempts: 20 },
      }),
    ).toMatchObject({ type: "invalid" });

    expect(validateMiniGameConfig({ key: "unknown", config: {} })).toEqual({
      type: "unknown-minigame",
    });
  });

  it("enforces action allow-list, deadlines, nonces and rate limits", () => {
    const definition = MVP_MINIGAME_DEFINITIONS[0];
    const deadlineAt = new Date("2026-07-08T12:00:00Z");
    const now = new Date("2026-07-08T11:59:00Z");

    expect(
      validateMiniGameAction({
        definition,
        actionType: "sequence-input",
        actionNonce: "nonce-1",
        seenNonces: new Set(),
        deadlineAt,
        now,
        recentActionCount: 0,
      }),
    ).toMatchObject({ type: "ok" });

    expect(
      validateMiniGameAction({
        definition,
        actionType: "forbidden",
        actionNonce: "nonce-1",
        seenNonces: new Set(),
        deadlineAt,
        now,
        recentActionCount: 0,
      }),
    ).toEqual({ type: "action-not-allowed" });

    expect(
      validateMiniGameAction({
        definition,
        actionType: "sequence-input",
        actionNonce: "nonce-1",
        seenNonces: new Set(["nonce-1"]),
        deadlineAt,
        now,
        recentActionCount: 0,
      }),
    ).toEqual({ type: "duplicate-action" });

    expect(
      validateMiniGameAction({
        definition,
        actionType: "sequence-input",
        actionNonce: "nonce-2",
        seenNonces: new Set(),
        deadlineAt,
        now,
        recentActionCount: 3,
      }),
    ).toMatchObject({ type: "rate-limit" });

    expect(
      validateMiniGameAction({
        definition,
        actionType: "sequence-input",
        actionNonce: "nonce-3",
        seenNonces: new Set(),
        deadlineAt,
        now: deadlineAt,
        recentActionCount: 0,
      }),
    ).toEqual({ type: "action-too-late" });
  });

  it("keeps sensitive server state out of client schemas", () => {
    for (const definition of MVP_MINIGAME_DEFINITIONS) {
      const publicState = JSON.stringify(definition.clientStateSchema);
      expect(publicState).not.toContain("answer");
      expect(publicState).not.toContain("solution");
      expect(publicState).not.toContain("seed");
      expect(definition.antiCheatPolicy).toHaveProperty("sensitiveStateKeysBlocked");
    }
  });
});
