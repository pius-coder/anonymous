import { describe, it, expect } from "vitest";
import {
  assertBootEnv,
  EnvValidationError,
  formatRequiredVarsReport,
  resolveAppEnv,
  validateServiceEnv,
} from "../index.js";

describe("L1 env validator", () => {
  it("resolves APP_ENV with NODE_ENV fallbacks", () => {
    expect(resolveAppEnv({ APP_ENV: "staging" })).toBe("staging");
    expect(resolveAppEnv({ NODE_ENV: "test" })).toBe("test");
    expect(resolveAppEnv({ NODE_ENV: "production" })).toBe("production");
    expect(resolveAppEnv({})).toBe("local");
  });

  it("allows incomplete local config (developer workstation)", () => {
    const result = validateServiceEnv({
      service: "api",
      env: { APP_ENV: "local", NODE_ENV: "development" },
    });
    expect(result.ok).toBe(true);
    expect(result.appEnv).toBe("local");
  });

  it("fails production boot when DATABASE_URL is missing", () => {
    const result = validateServiceEnv({
      service: "api",
      env: {
        APP_ENV: "production",
        NODE_ENV: "production",
        REDIS_URL: "redis://redis.internal:6379/0",
        API_URL: "https://api.example.com",
        GAME_WS_URL: "wss://live.example.com",
        FAPSHI_BASE_URL: "https://live.fapshi.com",
        FAPSHI_API_USER: "user",
        FAPSHI_API_KEY: "key",
        FAPSHI_WEBHOOK_SECRET: "whsec",
      },
    });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.field === "DATABASE_URL")).toBe(true);
  });

  it("fails production when API_URL is localhost", () => {
    const result = validateServiceEnv({
      service: "api",
      env: {
        APP_ENV: "production",
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://u:p@db.internal:5432/app",
        REDIS_URL: "redis://redis.internal:6379/0",
        API_URL: "http://localhost:3001",
        GAME_WS_URL: "wss://live.example.com",
        FAPSHI_BASE_URL: "https://live.fapshi.com",
        FAPSHI_API_USER: "user",
        FAPSHI_API_KEY: "key",
        FAPSHI_WEBHOOK_SECRET: "whsec",
      },
    });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code.includes("LOCALHOST") || i.message.includes("localhost"))).toBe(
      true,
    );
  });

  it("fails production when fapshi-local appears in any URL field", () => {
    const result = validateServiceEnv({
      service: "api",
      env: {
        APP_ENV: "production",
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://u:p@db.internal:5432/app",
        REDIS_URL: "redis://redis.internal:6379/0",
        API_URL: "https://api.example.com",
        GAME_WS_URL: "wss://live.example.com",
        FAPSHI_BASE_URL: "https://fapshi-local.example",
        FAPSHI_API_USER: "user",
        FAPSHI_API_KEY: "key",
        FAPSHI_WEBHOOK_SECRET: "whsec",
      },
    });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.message.toLowerCase().includes("fapshi"))).toBe(true);
  });

  it("assertBootEnv throws EnvValidationError before listen", () => {
    expect(() =>
      assertBootEnv("api", {
        APP_ENV: "production",
        NODE_ENV: "production",
      }),
    ).toThrow(EnvValidationError);
  });

  it("reports required var names without secret values", () => {
    const report = formatRequiredVarsReport("production");
    expect(report).toContain("DATABASE_URL");
    expect(report).toContain("(secret)");
    expect(report).not.toMatch(/postgresql:\/\//);
    expect(report).not.toContain("password=");
  });

  it("forbids fake notification provider in staging", () => {
    const result = validateServiceEnv({
      service: "worker",
      env: {
        APP_ENV: "staging",
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://u:p@db.staging:5432/app",
        REDIS_URL: "redis://redis.staging:6379/0",
        API_URL: "https://api.staging.example",
        GAME_WS_URL: "wss://live.staging.example",
        FAPSHI_BASE_URL: "https://sandbox.fapshi.com",
        FAPSHI_API_USER: "user",
        FAPSHI_API_KEY: "key",
        FAPSHI_WEBHOOK_SECRET: "whsec",
        NOTIFICATION_PROVIDER: "fake",
      },
    });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "FAKE_PROVIDER")).toBe(true);
  });
});
