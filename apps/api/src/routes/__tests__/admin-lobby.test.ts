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

const lobbyMocks = vi.hoisted(() => ({
  authorizeSessionStart: vi.fn(),
}));

vi.mock("@session-jeu/db", () => ({
  prisma: dbMocks.prisma,
  Prisma: {
    TransactionIsolationLevel: { Serializable: "Serializable" },
  },
  GameSessionStatus: {
    ACTIVE: "ACTIVE",
    WAITING_START: "WAITING_START",
    LIVE: "LIVE",
    CANCELLED: "CANCELLED",
  },
  SessionRegistrationStatus: {
    CHECKED_IN: "CHECKED_IN",
  },
}));

vi.mock("../../lobby/lobby.js", async () => {
  const actual =
    await vi.importActual<typeof import("../../lobby/lobby.js")>("../../lobby/lobby.js");
  return {
    ...actual,
    ...lobbyMocks,
  };
});

vi.mock("../../queues/registrationExpiration.js", () => ({
  scheduleRegistrationExpiration: vi.fn(),
}));

import { SESSION_COOKIE_NAME, hashOpaqueToken } from "../../auth/session.js";
import type { AuthVariables } from "../../auth/session.js";
import adminLobby from "../admin/lobby.js";

function createApp() {
  const app = new Hono<{ Variables: AuthVariables }>();
  app.route("/v1/admin", adminLobby);
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

describe("admin lobby routes", () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.prisma.authSession.findUnique.mockResolvedValue(validAuthSession());
    lobbyMocks.authorizeSessionStart.mockResolvedValue({
      type: "ok",
      session: { id: "session-1", status: "LIVE" },
      checkedInCount: 2,
    });
  });

  it("allows admin to start session when min checked-in players is reached", async () => {
    const res = await app.request("/v1/admin/sessions/session-1/start", {
      method: "POST",
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` },
    });

    expect(res.status).toBe(200);
    expect(lobbyMocks.authorizeSessionStart).toHaveBeenCalledWith({
      adminUserId: "admin-1",
      sessionId: "session-1",
    });
  });

  it("rejects start when min players is not reached", async () => {
    lobbyMocks.authorizeSessionStart.mockResolvedValue({
      type: "min-not-reached",
      checkedInCount: 1,
      minPlayers: 2,
    });

    const res = await app.request("/v1/admin/sessions/session-1/start", {
      method: "POST",
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` },
    });

    expect(res.status).toBe(409);
  });

  it("rejects non-admin role", async () => {
    dbMocks.prisma.authSession.findUnique.mockResolvedValue(validAuthSession("PLAYER"));

    const res = await app.request("/v1/admin/sessions/session-1/start", {
      method: "POST",
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` },
    });

    expect(res.status).toBe(403);
    expect(lobbyMocks.authorizeSessionStart).not.toHaveBeenCalled();
  });
});
