/**
 * Cross-process seed serialization for parallel Playwright workers.
 * Prevents unique violations on PaymentTransaction.idempotencyKey during concurrent db:seed.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { redactSecrets, safeLog } from "./worktree-env.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const LOCK_WAIT_MS = 180_000;
const POLL_MS = 150;
const STALE_MS = 120_000;

/**
 * @param {number} ms
 */
function sleepMs(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    // portable busy-wait
  }
}

/**
 * @param {string} databaseUrl
 */
export function seedLockDirFor(databaseUrl) {
  const hash = createHash("sha256").update(databaseUrl).digest("hex").slice(0, 16);
  return join(tmpdir(), `session-jeu-seed-${hash}.lock`);
}

/**
 * @param {string} lockDir
 */
function tryRemoveStale(lockDir) {
  try {
    const marker = join(lockDir, "startedAt");
    if (!existsSync(marker)) {
      rmSync(lockDir, { recursive: true, force: true });
      return;
    }
    const started = Number(readFileSync(marker, "utf8"));
    if (Number.isFinite(started) && Date.now() - started > STALE_MS) {
      safeLog("[seed-lock] removing stale lock");
      rmSync(lockDir, { recursive: true, force: true });
    }
  } catch {
    // ignore
  }
}

/**
 * Run db:seed under an exclusive lock for the target DATABASE_URL.
 * Concurrent callers block until they acquire the lock, then seed (idempotent).
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @param {{ root?: string }} [opts]
 * @returns {{ seeded: boolean, status: number }}
 */
export function runSeedIsolated(env = process.env, opts = {}) {
  const root = opts.root || env.MONOREPO_ROOT || ROOT;
  const databaseUrl = env.DATABASE_URL || env.TEST_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL/TEST_DATABASE_URL required for isolated seed");
  }

  const appEnv = (env.APP_ENV || "").toLowerCase();
  if (appEnv === "production" || appEnv === "staging") {
    throw new Error(`db:seed forbidden when APP_ENV=${appEnv}`);
  }

  const lockDir = seedLockDirFor(databaseUrl);
  const deadline = Date.now() + LOCK_WAIT_MS;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      mkdirSync(lockDir);
      writeFileSync(join(lockDir, "startedAt"), String(Date.now()));
      break;
    } catch (err) {
      if (err && /** @type {NodeJS.ErrnoException} */ (err).code !== "EEXIST") throw err;
      if (Date.now() > deadline) {
        throw new Error(`Timeout waiting for seed lock ${lockDir}`);
      }
      tryRemoveStale(lockDir);
      sleepMs(POLL_MS);
    }
  }

  try {
    safeLog("[seed-lock] running db:seed under exclusive lock");
    const result = spawnSync("pnpm", ["--filter", "@session-jeu/db", "db:seed"], {
      cwd: root,
      env: { ...process.env, ...env, DATABASE_URL: databaseUrl },
      encoding: "utf8",
    });
    if (result.status !== 0) {
      const errOut = redactSecrets(result.stderr || result.stdout || "no output");
      throw new Error(`db:seed failed (status ${result.status}): ${errOut}`);
    }
    return { seeded: true, status: 0 };
  } finally {
    try {
      rmSync(lockDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

export function runSeedIsolatedSync(env = process.env) {
  return runSeedIsolated(env);
}
