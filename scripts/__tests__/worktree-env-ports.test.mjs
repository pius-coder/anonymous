import { describe, expect, it } from "vitest";
import {
  NEXT_RESERVED_PORTS,
  resolveWorktreeEnv,
  safePort,
  stableOffset,
} from "../lib/worktree-env.mjs";

describe("worktree-env safe ports", () => {
  it("avoids Next.js reserved port 3659 (apple-sasl) for WEB base 3500", () => {
    // offset 159 → 3500+159 = 3659 reserved → bump to next free
    expect(safePort(3500, 159)).not.toBe(3659);
    expect(NEXT_RESERVED_PORTS.has(safePort(3500, 159))).toBe(false);
    expect(safePort(3500, 159)).toBe(3660);
  });

  it("keeps non-reserved ports stable", () => {
    expect(safePort(3500, 0)).toBe(3500);
    expect(safePort(3100, 42)).toBe(3142);
  });

  it("CI worktree id that previously mapped to 3659 no longer does", () => {
    const offset = stableOffset("ci-29573235073");
    expect(offset).toBe(159);
    const env = resolveWorktreeEnv({
      WORKTREE_ID: "ci-29573235073",
      NODE_ENV: "test",
    });
    expect(Number(env.WEB_PORT)).not.toBe(3659);
    expect(NEXT_RESERVED_PORTS.has(Number(env.WEB_PORT))).toBe(false);
    expect(Number(env.WEB_PORT)).toBe(3660);
  });

  it("never returns a reserved port for any offset in WEB range", () => {
    for (let o = 0; o < 200; o++) {
      const p = safePort(3500, o);
      expect(NEXT_RESERVED_PORTS.has(p)).toBe(false);
      expect(p).toBeGreaterThanOrEqual(3500);
      expect(p).toBeLessThan(3500 + 200 + 200);
    }
  });
});
