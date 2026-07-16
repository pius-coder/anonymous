import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "fs";
import { resolve } from "path";
import {
  FROZEN_METHOD_COUNT,
  FROZEN_SERVICE_COUNT,
  FROZEN_SERVICES,
  PRE_SEQ01_METHOD_COUNT,
  PRE_SEQ01_SERVICE_COUNT,
  getServiceMatrixSummary,
} from "../matrix.js";
import { getContractsFoundation } from "../index.js";

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

function extractServiceRpcs(content: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const servicePattern = /service\s+([A-Za-z0-9_]+)\s*\{([\s\S]*?)\}/g;
  let match: RegExpExecArray | null;
  while ((match = servicePattern.exec(content)) !== null) {
    const [, name, body] = match;
    const rpcs = [...body.matchAll(/rpc\s+([A-Za-z0-9_]+)\s*\(/g)].map((m) => m[1]);
    map.set(name, rpcs);
  }
  return map;
}

describe("Frozen service matrix", () => {
  it("matches SEQ-01 freeze counts (12 services / 57 methods)", () => {
    expect(FROZEN_SERVICE_COUNT).toBe(12);
    expect(FROZEN_METHOD_COUNT).toBe(57);
    expect(getContractsFoundation().serviceCount).toBe(12);
    expect(getContractsFoundation().methodCount).toBe(57);
  });

  it("records historical pre-SEQ-01 baseline of 11/50", () => {
    expect(PRE_SEQ01_SERVICE_COUNT).toBe(11);
    expect(PRE_SEQ01_METHOD_COUNT).toBe(50);
  });

  it("aligns matrix with proto service and rpc names", () => {
    const discovered = new Map<string, string[]>();
    for (const file of discoverProtoFiles()) {
      const content = readFileSync(file, "utf-8");
      for (const [service, rpcs] of extractServiceRpcs(content)) {
        discovered.set(service, rpcs);
      }
    }

    expect(discovered.size).toBe(FROZEN_SERVICE_COUNT);

    for (const spec of FROZEN_SERVICES) {
      expect(discovered.has(spec.service), `missing service ${spec.service}`).toBe(true);
      const protoMethods = discovered.get(spec.service)!;
      expect(protoMethods.sort()).toEqual(spec.methods.map((m) => m.name).sort());
    }

    const totalProto = [...discovered.values()].reduce((n, m) => n + m.length, 0);
    expect(totalProto).toBe(FROZEN_METHOD_COUNT);
  });

  it("summary enumerates every frozen service", () => {
    const summary = getServiceMatrixSummary();
    expect(summary.services).toBe(12);
    expect(summary.methods).toBe(57);
    expect(summary.byService.map((s) => s.service)).toContain("ComplianceService");
    expect(summary.byService.map((s) => s.service)).toContain("IdentityService");
  });
});
