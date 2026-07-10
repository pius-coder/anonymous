import { existsSync, readFileSync, statSync } from "fs";
import { describe, expect, it } from "vitest";
import { getCountdownState } from "../components/game/motion-utils";

const requiredRetrouiComponents = [
  "alert",
  "avatar",
  "badge",
  "button",
  "card",
  "dialog",
  "input",
  "label",
  "progress",
  "tabs",
];

describe("Feature 17 design system assets", () => {
  for (const component of requiredRetrouiComponents) {
    it(`keeps RetroUI ${component} copied locally`, () => {
      expect(existsSync(`src/components/retroui/${component}.tsx`)).toBe(true);
    });
  }

  it("keeps generated gaming images in public assets", () => {
    for (const asset of [
      "public/images/session-jeu-hero-generated.png",
      "public/images/session-flow-generated.png",
    ]) {
      expect(existsSync(asset)).toBe(true);
      expect(statSync(asset).size).toBeGreaterThan(100_000);
    }
  });

  it("guards /dev/ui in production", () => {
    const source = readFileSync("src/app/(client)/dev/ui/page.tsx", "utf-8");
    expect(source).toContain('process.env.NODE_ENV === "production"');
    expect(source).toContain("notFound()");
  });

  it("defines the premium surface and depth tokens", () => {
    const source = readFileSync("src/app/globals.css", "utf-8");
    for (const token of [
      "--surface-raised",
      "--surface-floating",
      "--surface-stroke",
      "--shadow-raised",
      "--shadow-floating",
      ".premium-panel",
      ".premium-inset",
    ]) {
      expect(source).toContain(token);
    }
  });

  it("guards /dev/social in production", () => {
    const source = readFileSync("src/app/(client)/dev/social/page.tsx", "utf-8");
    expect(source).toContain('process.env.NODE_ENV === "production"');
    expect(source).toContain("notFound()");
  });

  it("pauses the shared Pixi ticker while the page is hidden", () => {
    const source = readFileSync("src/components/games/pixi/GameCanvas.tsx", "utf-8");
    expect(source).toContain('document.visibilityState === "hidden"');
    expect(source).toContain("app.ticker.stop()");
    expect(source).toContain("app.ticker.start()");
  });
});

describe("Feature 17 motion primitives", () => {
  it("computes countdown state from server epoch values", () => {
    const state = getCountdownState({
      deadlineEpochMs: 1_000_000,
      nowEpochMs: 958_500,
      totalMs: 60_000,
    });

    expect(state.remainingMs).toBe(41_500);
    expect(state.seconds).toBe(42);
    expect(state.progress).toBeCloseTo(0.6916, 3);
    expect(state.isExpired).toBe(false);
  });

  it("expires countdowns when server epoch has passed the deadline", () => {
    expect(
      getCountdownState({
        deadlineEpochMs: 1_000_000,
        nowEpochMs: 1_000_001,
        totalMs: 60_000,
      }),
    ).toMatchObject({
      remainingMs: 0,
      seconds: 0,
      isExpired: true,
    });
  });

  it("uses reduced motion APIs in visual primitives", () => {
    const source = readFileSync("src/components/game/motion-primitives.tsx", "utf-8");
    expect(source).toContain("useReducedMotion");
    expect(source).toContain("AnimatePresence");
    expect(source).toContain("deadlineEpochMs");
  });
});
