import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

const dbMocks = vi.hoisted(() => ({
  prisma: {
    miniGameDefinition: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@session-jeu/db", () => ({
  prisma: dbMocks.prisma,
}));

import minigames from "../minigames.js";

function createApp() {
  const app = new Hono();
  app.route("/v1/minigames", minigames);
  return app;
}

describe("public mini-game routes", () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.prisma.miniGameDefinition.findUnique.mockResolvedValue({
      id: "minigame-1",
      key: "memory-sequence",
      name: "Sequence memoire",
      description: "Memory game",
      family: "SOLO",
      playerMode: "SOLO",
      resolverId: "solo-score",
      enabled: true,
      version: 1,
      configSchema: { type: "object" },
      defaultConfig: { durationSeconds: 60 },
      allowedActions: [{ type: "submit-score" }],
      antiCheatPolicy: { serverTimersOnly: true },
      clientStateSchema: { phase: "string" },
      uiCopy: { objective: "Play" },
    });
  });

  it("returns public schema without anti-cheat internals", async () => {
    const res = await app.request("/v1/minigames/minigame-1/schema");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.definition.key).toBe("memory-sequence");
    expect(body.data.definition.antiCheatPolicy).toBeUndefined();
    expect(dbMocks.prisma.miniGameDefinition.findUnique).toHaveBeenCalledWith({
      where: { id: "minigame-1" },
    });
  });

  it("hides disabled definitions", async () => {
    dbMocks.prisma.miniGameDefinition.findUnique.mockResolvedValueOnce({
      id: "minigame-1",
      enabled: false,
    });

    const res = await app.request("/v1/minigames/minigame-1/schema");

    expect(res.status).toBe(404);
  });
});
