#!/usr/bin/env node
/**
 * L3/L4 integration: disposable infra → empty migrate → API + Colyseus → harness tests → teardown.
 * Guarantees teardown even after failures.
 */
import { spawnSync } from "node:child_process";
import {
  ROOT,
  resolveWorktreeEnv,
  toChildEnv,
  infraUp,
  infraDown,
  migrateEmptyDb,
  spawnService,
  stopServices,
  waitForHttpOk,
  waitForPort,
  safeLog,
} from "./lib/infra.mjs";

const TIMEOUT_MS = Number(process.env.INTEGRATION_TIMEOUT_MS || 300_000);

async function main() {
  const env = resolveWorktreeEnv();
  const services = [];
  let infraStarted = false;
  const startedAt = Date.now();

  const shutdown = () => {
    stopServices(services);
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

    const childEnv = toChildEnv(env);

    // Ensure workspace packages are built for runtime imports
    safeLog("[integration] building dependencies");
    const build = spawnSync(
      "pnpm",
      ["exec", "turbo", "run", "build", "--filter=@session-jeu/api...", "--filter=@session-jeu/game-server..."],
      { cwd: ROOT, env: childEnv, stdio: "inherit" },
    );
    if (build.status !== 0) {
      throw new Error("dependency build failed");
    }

    services.push(
      spawnService({
        name: "api",
        command: "pnpm",
        args: ["--filter", "@session-jeu/api", "exec", "tsx", "src/index.ts"],
        env: childEnv,
      }),
    );
    services.push(
      spawnService({
        name: "game-server",
        command: "pnpm",
        args: ["--filter", "@session-jeu/game-server", "exec", "tsx", "src/index.ts"],
        env: childEnv,
      }),
    );

    await waitForHttpOk(`${env.API_URL}/health`, 90_000);
    await waitForPort(Number(env.GAME_SERVER_PORT), env.TEST_HOST, 90_000);
    safeLog("[integration] services ready");

    const testEnv = {
      ...childEnv,
      // Vitest files should not re-listen; they call live servers over the network.
      HARNESS_MODE: "1",
    };

    const vitest = spawnSync(
      "pnpm",
      ["exec", "vitest", "run", "--config", "tests/integration/vitest.config.ts"],
      { cwd: ROOT, env: testEnv, stdio: "inherit" },
    );

    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
    safeLog(`[integration] finished in ${elapsed}s status=${vitest.status}`);
    if (vitest.status !== 0) {
      process.exitCode = vitest.status ?? 1;
    }
  } catch (err) {
    safeLog("[integration] FAILED:", String(err));
    process.exitCode = 1;
  } finally {
    shutdown();
    if (Date.now() - startedAt > TIMEOUT_MS) {
      safeLog("[integration] exceeded INTEGRATION_TIMEOUT_MS");
    }
  }
}

main();
