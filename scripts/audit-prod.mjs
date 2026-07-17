#!/usr/bin/env node
/**
 * Production dependency audit gate with explicit severity budget.
 * Default: fail on high/critical. Moderate can be reported without fail unless AUDIT_FAIL_MODERATE=1.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const level = process.env.AUDIT_LEVEL || "high";

const result = spawnSync("pnpm", ["audit", "--prod", `--audit-level=${level}`], {
  cwd: ROOT,
  encoding: "utf8",
  env: process.env,
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

// pnpm audit exits non-zero when vulnerabilities at or above level exist
if (result.status !== 0) {
  console.error(`[audit-prod] FAILED (level=${level}, status=${result.status})`);
  process.exit(result.status ?? 1);
}

console.log(`[audit-prod] ok (level=${level})`);
process.exit(0);
