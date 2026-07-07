import { describe, it, expect } from "vitest";
import { GAME_ENGINE_VERSION } from "../index.js";

describe("GAME_ENGINE_VERSION", () => {
  it("should be defined", () => {
    expect(GAME_ENGINE_VERSION).toBeDefined();
  });

  it("should be a string", () => {
    expect(typeof GAME_ENGINE_VERSION).toBe("string");
  });

  it("should follow semver format", () => {
    expect(GAME_ENGINE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("should be 0.0.1", () => {
    expect(GAME_ENGINE_VERSION).toBe("0.0.1");
  });
});
