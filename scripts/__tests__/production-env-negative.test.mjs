/**
 * L1 negative: production incomplete config must fail validation before listen.
 */
import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

function runValidate(env) {
  return spawnSync("node", ["scripts/validate-env.mjs", "--service", "api", "--json"], {
    cwd: ROOT,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
}

describe("L1 production env negative", () => {
  it("exits non-zero when production env is incomplete", () => {
    const result = runValidate({
      APP_ENV: "production",
      NODE_ENV: "production",
      // intentionally missing DATABASE_URL and secrets
      PATH: process.env.PATH,
      HOME: process.env.HOME,
    });
    expect(result.status).not.toBe(0);
    const body = JSON.parse(result.stdout || "{}");
    expect(body.ok).toBe(false);
    expect(body.requiredVars).toContain("DATABASE_URL");
  });

  it("exits zero for local incomplete config", () => {
    const result = runValidate({
      APP_ENV: "local",
      NODE_ENV: "development",
      PATH: process.env.PATH,
      HOME: process.env.HOME,
    });
    expect(result.status).toBe(0);
  });

  it("rejects production localhost API_URL", () => {
    const result = runValidate({
      APP_ENV: "production",
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://u:p@db.internal:5432/app",
      REDIS_URL: "redis://redis.internal:6379/0",
      API_URL: "http://localhost:3001",
      GAME_WS_URL: "wss://live.example.com",
      FAPSHI_BASE_URL: "https://live.fapshi.com",
      FAPSHI_API_USER: "user",
      FAPSHI_API_KEY: "key",
      FAPSHI_WEBHOOK_SECRET: "secret",
      PATH: process.env.PATH,
      HOME: process.env.HOME,
    });
    expect(result.status).not.toBe(0);
  });
});
