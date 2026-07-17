#!/usr/bin/env node
/**
 * L1 unit suite via Turbo — no external services required.
 * Strips integration env so accidental DATABASE_URL does not flip suites to L3.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** @type {NodeJS.ProcessEnv} */
const env = {
  ...process.env,
  APP_ENV: process.env.APP_ENV || "test",
  NODE_ENV: "test",
  // Neutralize integration signals for pure unit runs
  DATABASE_URL: "",
  TEST_DATABASE_URL: "",
  REDIS_URL: "",
  REDIS_HOST: "",
  // Label for reports
  TEST_LEVEL: "L1",
};

// Remove empty keys so Prisma clients don't see blank URLs
delete env.DATABASE_URL;
delete env.TEST_DATABASE_URL;
delete env.REDIS_URL;

const result = spawnSync("pnpm", ["exec", "turbo", "run", "test"], {
  cwd: ROOT,
  stdio: "inherit",
  env,
});

process.exit(result.status ?? 1);
