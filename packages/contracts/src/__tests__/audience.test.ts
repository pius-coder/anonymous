import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const FORBIDDEN_IN_PLAYER = [
  "password_hash",
  "token_hash",
  "internal_token",
  "secret",
  "api_key",
];

const PROTO_BASE = resolve(__dirname, "../../proto");

const PROTO_FILES = [
  "session/v1/session.proto",
  "participation/v1/participation.proto",
  "preparation/v1/preparation.proto",
  "realtime/v1/events.proto",
  "round/v1/round.proto",
  "scoring/v1/scoring.proto",
  "notification/v1/notification.proto",
];

const ADMIN_FILES = [
  "admin/v1/admin.proto",
];

describe("Audience separation", () => {
  for (const protoFile of PROTO_FILES) {
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
    it(`admin file should exist: ${protoFile}`, () => {
      const filePath = resolve(PROTO_BASE, protoFile);
      expect(existsSync(filePath)).toBe(true);
    });
  }
});
