#!/usr/bin/env node
/**
 * L5 E2E: disposable infra → migrate → Playwright (api/game/web) → teardown.
 * Seed isolation is handled by Playwright globalSetup + seed-lock (parallel workers safe).
 */
import { spawnSync } from "node:child_process";
import {
  ROOT,
  resolveWorktreeEnv,
  toChildEnv,
  infraUp,
  infraDown,
  migrateEmptyDb,
  safeLog,
} from "./lib/infra.mjs";

async function main() {
  const env = resolveWorktreeEnv();
  let infraStarted = false;
  const startedAt = Date.now();

  const shutdown = () => {
    if (infraStarted) {
      infraDown(env);
      infraStarted = false;
    }
  };

  process.on("SIGINT", () => {
    shutdown();
    process.exit(130);
  });
  process.on("SIGTERM", () => {
    shutdown();
    process.exit(143);
  });

  try {
    await infraUp(env);
    infraStarted = true;
    migrateEmptyDb(env);

    const childEnv = {
      ...toChildEnv(env),
      APP_ENV: "test",
      TEST_LEVEL: "L5",
      // Parallel workers OK with seed-lock
      PLAYWRIGHT_WORKERS: process.env.PLAYWRIGHT_WORKERS || (process.env.CI ? "2" : ""),
    };

    // Build runtime deps only. Playwright webServer uses `next dev` (not next build).
    // Full web production build is covered by the gates job.
    safeLog("[e2e] building api/game-server/config (web via next dev in Playwright)");
    const build = spawnSync(
      "pnpm",
      [
        "exec",
        "turbo",
        "run",
        "build",
        "--filter=@session-jeu/api...",
        "--filter=@session-jeu/game-server...",
        "--filter=@session-jeu/config",
      ],
      { cwd: ROOT, env: childEnv, stdio: "inherit" },
    );
    if (build.status !== 0) {
      throw new Error("e2e dependency build failed");
    }

    spawnSync("pnpm", ["--filter", "@session-jeu/web", "exec", "playwright", "install", "chromium"], {
      cwd: ROOT,
      env: childEnv,
      stdio: "inherit",
    });

    safeLog("[e2e] playwright test (webServer starts api, game-server, web)");
    const e2e = spawnSync("pnpm", ["--filter", "@session-jeu/web", "test:e2e"], {
      cwd: ROOT,
      env: childEnv,
      stdio: "inherit",
    });

    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
    safeLog(`[e2e] finished in ${elapsed}s status=${e2e.status}`);
    if (e2e.status !== 0) {
      process.exitCode = e2e.status ?? 1;
    }
  } catch (err) {
    safeLog("[e2e] FAILED:", String(err));
    process.exitCode = 1;
  } finally {
    shutdown();
  }
}

main();
