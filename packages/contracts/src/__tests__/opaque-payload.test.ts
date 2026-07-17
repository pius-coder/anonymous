import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "fs";
import { relative, resolve } from "path";
import { GAMEPLAY_PAYLOAD_MAX_BYTES } from "../matrix.js";

const PROTO_BASE = resolve(__dirname, "../../proto");

function discoverProtoFiles(): string[] {
  const results: string[] = [];
  const walk = (dir: string) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = resolve(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".proto")) results.push(full);
    }
  };
  walk(PROTO_BASE);
  return results;
}

describe("Opaque gameplay payload policy", () => {
  it("documents gameplay max bytes constant", () => {
    expect(GAMEPLAY_PAYLOAD_MAX_BYTES).toBe(4096);
  });

  it("requires schema fields near every bare bytes payload in minigame/round", () => {
    const targets = discoverProtoFiles().filter((f) => {
      const rel = relative(PROTO_BASE, f).replaceAll("\\", "/");
      return rel.startsWith("minigame/") || rel.startsWith("round/");
    });

    for (const file of targets) {
      const content = readFileSync(file, "utf-8");
      if (!/\bbytes\s+\w+\s*=\s*\d+/.test(content)) continue;

      // Files with bytes must also declare schema_id / schema_version / max bounds
      // or exclusively use TypedBytesEnvelope.
      const hasTypedEnvelope = content.includes("TypedBytesEnvelope");
      const hasSchemaId = content.includes("schema_id");
      const hasSchemaVersion = content.includes("schema_version");
      const hasMax =
        content.includes("payload_max_bytes") ||
        content.includes("max_bytes") ||
        content.includes("4096");

      expect(
        hasTypedEnvelope || (hasSchemaId && hasSchemaVersion && hasMax),
        `${relative(PROTO_BASE, file)} has bytes without schema/version/limit policy`,
      ).toBe(true);
    }
  });

  it("forbids provider secret field names in payment proto", () => {
    const payment = readFileSync(resolve(PROTO_BASE, "payment/v1/payment.proto"), "utf-8");
    // Match field declarations only (not free-form comments).
    const fieldDecls = [...payment.matchAll(/^\s*(optional\s+|repeated\s+)?([a-zA-Z0-9_.]+)\s+([a-zA-Z0-9_]+)\s*=/gm)].map(
      (m) => m[3],
    );
    for (const forbidden of ["apiuser", "apikey", "api_key", "authorization", "provider_secret", "raw_provider_payload"]) {
      expect(fieldDecls.map((f) => f.toLowerCase())).not.toContain(forbidden);
    }
  });
});

