import { describe, expect, it } from "vitest";
import { FOUNDATION_BOUNDARIES, FOUNDATION_VERSION, hashOpaqueToken } from "../index.js";

describe("shared foundation", () => {
  it("exports the v0.1 foundation boundaries", () => {
    expect(FOUNDATION_VERSION).toBe("v0.1");
    expect(FOUNDATION_BOUNDARIES).toContain("contracts");
    expect(FOUNDATION_BOUNDARIES).toContain("realtime");
  });

  it("hashes opaque tokens deterministically without exposing the token", () => {
    const hash = hashOpaqueToken("live-token");

    expect(hash).toHaveLength(64);
    expect(hash).toBe(hashOpaqueToken("live-token"));
    expect(hash).not.toContain("live-token");
  });
});
