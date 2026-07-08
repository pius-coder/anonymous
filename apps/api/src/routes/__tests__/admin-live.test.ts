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

const liveMocks = vi.hoisted(() => ({
  pauseLiveSession: vi.fn(),
  resumeLiveSession: vi.fn(),
}));

vi.mock("@session-jeu/db", () => ({
  prisma: dbMocks.prisma,
  Prisma: {
    TransactionIsolationLevel: { Serializable: "Serializable" },
  },
  GameSessionStatus: {
    LIVE: "LIVE",
    CANCELLED: "CANCELLED",
  },
  LivePhase: {
    BRIEFING: "BRIEFING",
    PAUSED: "PAUSED",
    ROUND_ACTIVE: "ROUND_ACTIVE",
  },
  SessionRegistrationStatus: {
    CHECKED_IN: "CHECKED_IN",
    IN_ROOM: "IN_ROOM",
  },
}));

vi.mock("../../live/live.js", async () => {
  const actual = await vi.importActual<typeof import("../../live/live.js")>("../../live/live.js");
  return {
    ...actual,
    ...liveMocks,
  };
});

import { SESSION_COOKIE_NAME, hashOpaqueToken } from "../../auth/session.js";
import type { AuthVariables } from "../../auth/session.js";
import adminLive from "../admin/live.js";

function createApp() {
  const app = new Hono<{ Variables: AuthVariables }>();
  app.route("/v1/admin", adminLive);
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

function liveState() {
  const now = new Date("2026-07-08T00:00:00Z");
  return {
    id: "live-state-1",
    sessionId: "session-1",
    roomId: "room-1",
    phase: "PAUSED",
    previousPhase: "ROUND_ACTIVE",
    currentRoundId: "round-1",
    phaseStartedAt: now,
    pausedAt: now,
    pauseReason: "network incident",
    createdAt: now,
    updatedAt: now,
  };
}

describe("admin live routes", () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.prisma.authSession.findUnique.mockResolvedValue(validAuthSession());
    liveMocks.pauseLiveSession.mockResolvedValue({ type: "ok", liveState: liveState() });
    liveMocks.resumeLiveSession.mockResolvedValue({
      type: "ok",
      liveState: { ...liveState(), phase: "ROUND_ACTIVE", previousPhase: null },
    });
  });

  it("pauses a live session and audits reason through service", async () => {
    const res = await app.request("/v1/admin/live/session-1/pause", {
      method: "POST",
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=session-token`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ reason: "network incident" }),
    });

    expect(res.status).toBe(200);
    expect(liveMocks.pauseLiveSession).toHaveBeenCalledWith({
      adminUserId: "admin-1",
      sessionId: "session-1",
      reason: "network incident",
    });
  });

  it("resumes a paused live session", async () => {
    const res = await app.request("/v1/admin/live/session-1/resume", {
      method: "POST",
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` },
    });

    expect(res.status).toBe(200);
    expect(liveMocks.resumeLiveSession).toHaveBeenCalledWith({
      adminUserId: "admin-1",
      sessionId: "session-1",
    });
  });

  it("rejects non-admin users", async () => {
    dbMocks.prisma.authSession.findUnique.mockResolvedValue(validAuthSession("PLAYER"));

    const res = await app.request("/v1/admin/live/session-1/resume", {
      method: "POST",
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` },
    });

    expect(res.status).toBe(403);
    expect(liveMocks.resumeLiveSession).not.toHaveBeenCalled();
  });
});
