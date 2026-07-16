#!/usr/bin/env node
/**
 * L1 unit suite via Turbo — no external services required.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const result = spawnSync("pnpm", ["exec", "turbo", "run", "test"], {
  cwd: ROOT,
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
