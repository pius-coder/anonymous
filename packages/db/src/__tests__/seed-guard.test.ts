import { describe, expect, it } from "vitest";
import { assertSeedAllowed } from "../seed.js";

describe("seed production guard", () => {
  it("allows local and test environments", () => {
    expect(() => assertSeedAllowed({ APP_ENV: "local" })).not.toThrow();
    expect(() => assertSeedAllowed({ APP_ENV: "development" })).not.toThrow();
    expect(() => assertSeedAllowed({ APP_ENV: "test" })).not.toThrow();
    expect(() => assertSeedAllowed({})).not.toThrow();
  });

  it("blocks production and staging", () => {
    expect(() => assertSeedAllowed({ APP_ENV: "production" })).toThrow(
      /db:seed forbidden when APP_ENV=production/,
    );
    expect(() => assertSeedAllowed({ APP_ENV: "staging" })).toThrow(
      /db:seed forbidden when APP_ENV=staging/,
    );
    expect(() => assertSeedAllowed({ APP_ENV: "PRODUCTION" })).toThrow();
  });
});
