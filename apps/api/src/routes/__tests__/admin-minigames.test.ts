import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

const dbMocks = vi.hoisted(() => ({
  prisma: {
    authSession: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const catalogueMocks = vi.hoisted(() => ({
  findMiniGameDefinition: vi.fn(),
  listMiniGames: vi.fn(),
  setMiniGameEnabled: vi.fn(),
  validateMiniGameConfig: vi.fn(),
}));

const securityMocks = vi.hoisted(() => ({
  assertMiniGameRiskAllowed: vi.fn(),
}));

vi.mock("@session-jeu/db", () => ({
  prisma: dbMocks.prisma,
}));

vi.mock("../../minigames/catalogue.js", () => catalogueMocks);
vi.mock("../../security/security.js", async () => {
  const actual = await vi.importActual<typeof import("../../security/security.js")>(
    "../../security/security.js",
  );
  return {
    ...actual,
    assertMiniGameRiskAllowed: securityMocks.assertMiniGameRiskAllowed,
  };
});

import { SESSION_COOKIE_NAME, hashOpaqueToken } from "../../auth/session.js";
import type { AuthVariables } from "../../auth/session.js";
import adminMinigames from "../admin/minigames.js";

function createApp() {
  const app = new Hono<{ Variables: AuthVariables }>();
  app.route("/v1/admin/minigames", adminMinigames);
  return app;
}

function validAuthSession(role: "PLAYER" | "ADMIN" | "SUPER_ADMIN" = "ADMIN") {
  return {
    id: "auth-session-1",
    tokenHash: hashOpaqueToken("session-token"),
    sessionVersion: 1,
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    user: {
      id: "admin-1",
      email: "admin@example.com",
      name: "Admin",
      role,
      isActive: true,
      sessionVersion: 1,
    },
  };
}

function miniGameDefinition() {
  return {
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
  };
}

describe("admin mini-game routes", () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.prisma.authSession.findUnique.mockResolvedValue(validAuthSession());
    catalogueMocks.listMiniGames.mockResolvedValue([miniGameDefinition()]);
    catalogueMocks.setMiniGameEnabled.mockResolvedValue({ ...miniGameDefinition(), enabled: false });
    catalogueMocks.findMiniGameDefinition.mockResolvedValue(miniGameDefinition());
    catalogueMocks.validateMiniGameConfig.mockReturnValue({
      type: "ok",
      config: { durationSeconds: 60 },
    });
    securityMocks.assertMiniGameRiskAllowed.mockResolvedValue({ type: "ok" });
  });

  it("lists catalogue definitions for admins", async () => {
    const res = await app.request("/v1/admin/minigames", {
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.definitions).toHaveLength(1);
    expect(catalogueMocks.listMiniGames).toHaveBeenCalled();
  });

  it("rejects non-admin users", async () => {
    dbMocks.prisma.authSession.findUnique.mockResolvedValue(validAuthSession("PLAYER"));

    const res = await app.request("/v1/admin/minigames", {
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` },
    });

    expect(res.status).toBe(403);
    expect(catalogueMocks.listMiniGames).not.toHaveBeenCalled();
  });

  it("enables or disables a definition through service and audit path", async () => {
    const res = await app.request("/v1/admin/minigames/minigame-1/enable", {
      method: "POST",
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=session-token`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ enabled: false }),
    });

    expect(res.status).toBe(200);
    expect(catalogueMocks.setMiniGameEnabled).toHaveBeenCalledWith({
      id: "minigame-1",
      enabled: false,
      adminUserId: "admin-1",
    });
  });

  it("validates configs and maps invalid configs to 400", async () => {
    catalogueMocks.validateMiniGameConfig.mockReturnValueOnce({
      type: "invalid",
      issues: [{ path: ["durationSeconds"], message: "Too small" }],
    });

    const res = await app.request("/v1/admin/minigames/validate-config", {
      method: "POST",
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=session-token`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        key: "memory-sequence",
        config: { durationSeconds: 5, winnersCount: 3, maxAttempts: 20 },
      }),
    });

    expect(res.status).toBe(400);
    expect(catalogueMocks.validateMiniGameConfig).toHaveBeenCalledWith({
      key: "memory-sequence",
      config: { durationSeconds: 5, winnersCount: 3, maxAttempts: 20 },
    });
  });

  it("blocks chance-dominant game risk without compliance review", async () => {
    securityMocks.assertMiniGameRiskAllowed.mockResolvedValueOnce({
      type: "blocked",
      gate: { type: "MINI_GAME_RISK", scope: "chance-dominant" },
    });

    const res = await app.request("/v1/admin/minigames/validate-config", {
      method: "POST",
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=session-token`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        key: "memory-sequence",
        config: { durationSeconds: 60, winnersCount: 3, maxAttempts: 20 },
        riskProfile: { chanceDominant: true },
      }),
    });

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("422_UNSUPPORTED_GAME_RISK");
  });
});
