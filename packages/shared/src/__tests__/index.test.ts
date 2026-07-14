import { describe, expect, it } from "vitest";
import { FOUNDATION_BOUNDARIES, FOUNDATION_VERSION } from "../index.js";

describe("shared foundation", () => {
  it("exports the v0.1 foundation boundaries", () => {
    expect(FOUNDATION_VERSION).toBe("v0.1");
    expect(FOUNDATION_BOUNDARIES).toContain("contracts");
    expect(FOUNDATION_BOUNDARIES).toContain("realtime");
  });
});

