import { defineConfig, devices } from "@playwright/test";
import { join } from "node:path";

// Playwright loads this config from apps/web (package cwd). Avoid import.meta (CJS load path).
const monorepoRoot = process.env.MONOREPO_ROOT || join(process.cwd(), "../..");

const webPort = process.env.WEB_PORT || "3000";
const apiPort = process.env.API_PORT || process.env.PORT || "3001";
const gamePort = process.env.GAME_SERVER_PORT || process.env.GAME_PORT || "3002";
const host = process.env.TEST_HOST || "127.0.0.1";
const baseURL = process.env.E2E_BASE_URL || process.env.PLAYWRIGHT_BASE_URL || `http://${host}:${webPort}`;
const apiUrl = process.env.API_URL || `http://${host}:${apiPort}`;
const gameWsUrl = process.env.GAME_WS_URL || `ws://${host}:${gamePort}`;
const gameReadyPort = process.env.GAME_READY_PORT || String(Number(gamePort) + 10000);

const reuse = !process.env.CI;

/**
 * Shared env for Playwright-managed webServers.
 * Must NOT set NODE_ENV=test (api/game-server skip listen in that mode).
 */
const serviceEnv = {
  ...process.env,
  NODE_ENV: process.env.HARNESS_NODE_ENV || "development",
  PORT: String(apiPort),
  API_PORT: String(apiPort),
  API_URL: apiUrl,
  GAME_SERVER_PORT: String(gamePort),
  GAME_PORT: String(gamePort),
  GAME_READY_PORT: String(gameReadyPort),
  GAME_WS_URL: gameWsUrl,
  WEB_PORT: String(webPort),
  E2E_BASE_URL: baseURL,
  DATABASE_URL: process.env.DATABASE_URL || process.env.TEST_DATABASE_URL || "",
  TEST_DATABASE_URL: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || "",
  REDIS_URL: process.env.REDIS_URL || "",
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 60_000,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }], ["junit", { outputFile: "test-results/e2e-junit.xml" }]]
    : "html",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      name: "api",
      command: "pnpm --filter @session-jeu/api exec tsx src/index.ts",
      url: `${apiUrl}/health`,
      timeout: 120_000,
      reuseExistingServer: reuse,
      env: serviceEnv,
    },
    {
      name: "game-server",
      command: "node scripts/e2e-webserver-game.mjs",
      cwd: monorepoRoot,
      url: `http://${host}:${gameReadyPort}/`,
      timeout: 120_000,
      reuseExistingServer: reuse,
      env: serviceEnv,
    },
    {
      name: "web",
      command: `pnpm --filter @session-jeu/web exec next dev --hostname ${host} --port ${webPort}`,
      url: baseURL,
      timeout: 180_000,
      reuseExistingServer: reuse,
      env: {
        ...serviceEnv,
        PORT: String(webPort),
      },
    },
  ],
});
