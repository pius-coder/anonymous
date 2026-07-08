import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

const securityMocks = vi.hoisted(() => ({
  createAntiCheatSignal: vi.fn(),
}));

vi.mock("../../security/security.js", async () => {
  const actual = await vi.importActual<typeof import("../../security/security.js")>(
    "../../security/security.js",
  );
  return {
    ...actual,
    createAntiCheatSignal: securityMocks.createAntiCheatSignal,
  };
});

import anticheat from "../internal/anticheat.js";

function createApp() {
  const app = new Hono();
  app.route("/internal", anticheat);
  return app;
}

describe("internal anti-cheat routes", () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INTERNAL_API_KEY = "internal-key";
    securityMocks.createAntiCheatSignal.mockResolvedValue({
      event: { id: "anticheat-1" },
      risk: { id: "risk-1" },
    });
  });

  it("rejects missing internal auth", async () => {
    const res = await app.request("/internal/anticheat/signal", {
      method: "POST",
      body: JSON.stringify({ type: "DOUBLE_SUBMIT", severity: "HIGH" }),
      headers: { "content-type": "application/json" },
    });

    expect(res.status).toBe(401);
  });

  it("records anti-cheat signals", async () => {
    const res = await app.request("/internal/anticheat/signal", {
      method: "POST",
      body: JSON.stringify({
        type: "AUTO_CLICK",
        severity: "HIGH",
        sessionId: "session-1",
        userId: "player-1",
      }),
      headers: {
        "content-type": "application/json",
        "x-internal-api-key": "internal-key",
      },
    });

    expect(res.status).toBe(201);
    expect(securityMocks.createAntiCheatSignal).toHaveBeenCalledWith(
      expect.objectContaining({ type: "AUTO_CLICK", severity: "HIGH" }),
    );
  });
});
