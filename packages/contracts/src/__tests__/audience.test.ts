import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import {
  assertAudienceSafe,
  findForbiddenFields,
  PLAYER_FORBIDDEN_FIELDS,
  OBSERVER_FORBIDDEN_FIELDS,
} from "../audience.js";

const FORBIDDEN_IN_PLAYER = [
  "password_hash",
  "token_hash",
  "internal_token",
  "secret",
  "api_key",
];

const PROTO_BASE = resolve(__dirname, "../../proto");

const PLAYER_VISIBLE_PROTOS = [
  "session/v1/session.proto",
  "participation/v1/participation.proto",
  "preparation/v1/preparation.proto",
  "realtime/v1/events.proto",
  "round/v1/round.proto",
  "scoring/v1/scoring.proto",
  "notification/v1/notification.proto",
  "minigame/v1/manifest.proto",
  "identity/v1/identity.proto",
];

const ADMIN_FILES = ["admin/v1/admin.proto", "compliance/v1/compliance.proto"];

describe("Audience separation (proto scan)", () => {
  for (const protoFile of PLAYER_VISIBLE_PROTOS) {
    it(`should not expose sensitive fields in player-visible proto: ${protoFile}`, () => {
      const filePath = resolve(PROTO_BASE, protoFile);
      expect(existsSync(filePath), `File ${protoFile} must exist`).toBe(true);
      const content = readFileSync(filePath, "utf-8");

      for (const term of FORBIDDEN_IN_PLAYER) {
        expect(
          content.includes(term),
          `Player-visible file ${protoFile} should not contain '${term}'`,
        ).toBe(false);
      }
    });
  }

  for (const protoFile of ADMIN_FILES) {
    it(`admin/compliance file should exist: ${protoFile}`, () => {
      const filePath = resolve(PROTO_BASE, protoFile);
      expect(existsSync(filePath)).toBe(true);
    });
  }
});

describe("Audience projection helpers", () => {
  it("rejects provisional scores for player projections", () => {
    const playerView = {
      round_id: "r1",
      provisional_scores: [{ player_id: "p1", score: 10 }],
    };
    expect(findForbiddenFields(playerView, "player")).toContain("provisional_scores");
    expect(() => assertAudienceSafe(playerView, "player")).toThrow(/provisional_scores/);
  });

  it("rejects provisional scores and tokens for observer projections", () => {
    const observerView = {
      current_phase: "ACTIVE",
      provisional_score: 99,
      connection_token: "live-secret",
    };
    const hits = findForbiddenFields(observerView, "observer");
    expect(hits).toEqual(expect.arrayContaining(["provisional_score", "connection_token"]));
  });

  it("allows published final scores for player", () => {
    const published = {
      round_id: "r1",
      final_scores: [{ player_id: "p1", score: 95, rank: 1 }],
      waiting_verification: false,
    };
    expect(findForbiddenFields(published, "player")).toEqual([]);
    assertAudienceSafe(published, "player");
  });

  it("allows admin provisional list without global secrets", () => {
    const adminView = {
      audience: "AUDIENCE_ADMIN",
      scores: [{ player_id: "p1", score: 10 }],
      status: "SCORE_STATUS_PROVISIONAL",
    };
    assertAudienceSafe(adminView, "admin");
  });

  it("rejects private minigame payload for observer", () => {
    const leak = { private_payload: "solution" };
    expect(findForbiddenFields(leak, "observer").length).toBeGreaterThan(0);
  });

  it("exports stable deny lists", () => {
    expect(PLAYER_FORBIDDEN_FIELDS).toContain("provisional_scores");
    expect(OBSERVER_FORBIDDEN_FIELDS).toContain("connection_token");
  });
});
