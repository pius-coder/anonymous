import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

const roundMocks = vi.hoisted(() => ({
  finalizeRound: vi.fn(),
  replayRound: vi.fn(),
}));

vi.mock("../../rounds/roundResolution.js", () => roundMocks);

import internalRounds from "../internal/rounds.js";

function createApp() {
  const app = new Hono();
  app.route("/internal", internalRounds);
  return app;
}

describe("internal round routes", () => {
  const app = createApp();
  const originalInternalKey = process.env.INTERNAL_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INTERNAL_API_KEY = "";
    roundMocks.finalizeRound.mockResolvedValue({
      type: "ok",
      resolutionLog: { id: "resolution-1", outputHash: "hash-1" },
      output: { qualifiedIds: ["player-1"], eliminatedIds: ["player-2"] },
    });
    roundMocks.replayRound.mockResolvedValue({
      type: "ok",
      matched: true,
      expectedOutputHash: "hash-1",
      actualOutputHash: "hash-1",
      output: {},
    });
  });

  afterEach(() => {
    process.env.INTERNAL_API_KEY = originalInternalKey;
  });

  it("finalizes a round through internal route", async () => {
    const res = await app.request("/internal/rounds/round-1/finalize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ family: "solo-score", winnersCount: 1 }),
    });

    expect(res.status).toBe(200);
    expect(roundMocks.finalizeRound).toHaveBeenCalledWith({
      roundId: "round-1",
      config: { family: "solo-score", winnersCount: 1 },
    });
  });

  it("maps non locked rounds to conflict", async () => {
    roundMocks.finalizeRound.mockResolvedValue({ type: "round-not-locked", status: "ACTIVE" });

    const res = await app.request("/internal/rounds/round-1/finalize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ family: "solo-score", winnersCount: 1 }),
    });

    expect(res.status).toBe(409);
  });

  it("replays finalized round", async () => {
    const res = await app.request("/internal/rounds/round-1/replay", {
      method: "POST",
    });

    expect(res.status).toBe(200);
    expect(roundMocks.replayRound).toHaveBeenCalledWith("round-1");
  });

  it("requires internal API key when configured", async () => {
    process.env.INTERNAL_API_KEY = "expected-key";

    const res = await app.request("/internal/rounds/round-1/replay", {
      method: "POST",
      headers: { "x-internal-api-key": "wrong-key" },
    });

    expect(res.status).toBe(401);
    expect(roundMocks.replayRound).not.toHaveBeenCalled();
  });
});
