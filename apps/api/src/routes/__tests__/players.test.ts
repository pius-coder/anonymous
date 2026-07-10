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

const playerMocks = vi.hoisted(() => ({
  getOrCreatePlayerProfile: vi.fn(),
  updatePlayerProfile: vi.fn(),
  listPlayerHistory: vi.fn(),
  recomputePlayerStats: vi.fn(),
  getPublicPlayerProfile: vi.fn(),
}));

vi.mock("@session-jeu/db", () => ({
  prisma: dbMocks.prisma,
  GameResultStatus: {
    WINNER: "WINNER",
    ELIMINATED: "ELIMINATED",
    COMPLETED: "COMPLETED",
  },
  GameSessionStatus: {
    ACTIVE: "ACTIVE",
    WAITING_START: "WAITING_START",
    LIVE: "LIVE",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED",
  },
  LedgerDirection: {
    CREDIT: "CREDIT",
  },
  LedgerType: {
    PRIZE: "PRIZE",
  },
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code: string;

      constructor(code: string) {
        super(code);
        this.code = code;
      }
    },
  },
  SessionRegistrationStatus: {
    NO_SHOW: "NO_SHOW",
    CANCELLED: "CANCELLED",
    REFUNDED: "REFUNDED",
    PAID: "PAID",
    CHECKED_IN: "CHECKED_IN",
    IN_ROOM: "IN_ROOM",
  },
}));

vi.mock("../../players/playerProfile.js", async () => {
  const actual = await vi.importActual<typeof import("../../players/playerProfile.js")>(
    "../../players/playerProfile.js",
  );
  return {
    ...actual,
    ...playerMocks,
  };
});

import { SESSION_COOKIE_NAME, hashOpaqueToken } from "../../auth/session.js";
import type { AuthVariables } from "../../auth/session.js";
import players from "../players.js";

function createApp() {
  const app = new Hono<{ Variables: AuthVariables }>();
  app.route("/v1", players);
  return app;
}

function validAuthSession(userId = "player-1") {
  return {
    id: "auth-session-1",
    tokenHash: hashOpaqueToken("session-token"),
    sessionVersion: 1,
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    user: {
      id: userId,
      email: `${userId}@example.com`,
      name: "Player",
      role: "PLAYER",
      isActive: true,
      sessionVersion: 1,
    },
  };
}

function profile(overrides: Record<string, unknown> = {}) {
  const now = new Date("2026-07-08T10:00:00Z");
  return {
    id: "profile-1",
    userId: "player-1",
    username: "kora221",
    bio: "Fast player",
    avatarUrl: "https://cdn.example.com/avatar.png",
    preferences: { locale: "fr-CM" },
    isPublic: true,
    level: 2,
    xp: 150,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function stats(overrides: Record<string, unknown> = {}) {
  const now = new Date("2026-07-08T10:00:00Z");
  return {
    id: "stats-1",
    userId: "player-1",
    sessionsPlayed: 4,
    sessionsWon: 1,
    winRate: 0.25,
    avgFinalRank: 2.5,
    creditsWonXaf: 5000,
    computedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("player profile routes", () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.prisma.authSession.findUnique.mockResolvedValue(validAuthSession());
    playerMocks.getOrCreatePlayerProfile.mockResolvedValue({
      profile: profile(),
      stats: stats(),
    });
    playerMocks.updatePlayerProfile.mockResolvedValue({
      type: "ok",
      profile: profile({ username: "newname" }),
      stats: stats(),
    });
    playerMocks.listPlayerHistory.mockResolvedValue({
      entries: [
        {
          registrationId: "registration-1",
          session: {
            id: "session-1",
            code: "ABC123",
            name: "Session",
            status: "COMPLETED",
            startTime: "2026-07-08T09:00:00.000Z",
            endTime: "2026-07-08T10:00:00.000Z",
            cancelledAt: null,
          },
          registrationStatus: "PAID",
          bucket: "completed",
          result: {
            finalRank: 1,
            finalStatus: "WINNER",
            prizeWonXaf: 5000,
            finalizedAt: "2026-07-08T10:00:00.000Z",
          },
          createdAt: "2026-07-08T08:00:00.000Z",
          updatedAt: "2026-07-08T08:00:00.000Z",
        },
      ],
      nextCursor: null,
    });
    playerMocks.recomputePlayerStats.mockResolvedValue(stats());
    playerMocks.getPublicPlayerProfile.mockResolvedValue({
      type: "ok",
      profile: profile(),
      stats: stats(),
    });
  });

  it("returns the current player's private profile", async () => {
    const res = await app.request("/v1/players/me", {
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` },
    });

    expect(res.status).toBe(200);
    expect(playerMocks.getOrCreatePlayerProfile).toHaveBeenCalledWith("player-1");
    const body = await res.json();
    expect(body.data.profile.username).toBe("kora221");
    expect(body.data.profile.preferences).toEqual({ locale: "fr-CM" });
  });

  it("rejects unauthenticated private profile access", async () => {
    const res = await app.request("/v1/players/me");

    expect(res.status).toBe(401);
    expect(playerMocks.getOrCreatePlayerProfile).not.toHaveBeenCalled();
  });

  it("maps invalid nicknames to the required error code", async () => {
    playerMocks.updatePlayerProfile.mockResolvedValueOnce({ type: "invalid-username" });

    const res = await app.request("/v1/players/me", {
      method: "PATCH",
      body: JSON.stringify({ username: "no" }),
      headers: {
        "content-type": "application/json",
        cookie: `${SESSION_COOKIE_NAME}=session-token`,
      },
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("400_INVALID_NICKNAME");
  });

  it("maps duplicate nicknames to the required error code", async () => {
    playerMocks.updatePlayerProfile.mockResolvedValueOnce({ type: "username-taken" });

    const res = await app.request("/v1/players/me", {
      method: "PATCH",
      body: JSON.stringify({ username: "taken_name" }),
      headers: {
        "content-type": "application/json",
        cookie: `${SESSION_COOKIE_NAME}=session-token`,
      },
    });

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("409_NICKNAME_TAKEN");
  });

  it("lists only the current player's history", async () => {
    const res = await app.request("/v1/players/me/history?limit=10", {
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` },
    });

    expect(res.status).toBe(200);
    expect(playerMocks.listPlayerHistory).toHaveBeenCalledWith({
      userId: "player-1",
      cursor: undefined,
      limit: 10,
    });
  });

  it("returns a public profile without sensitive fields", async () => {
    const res = await app.request("/v1/players/kora221");

    expect(res.status).toBe(200);
    const bodyText = await res.text();
    expect(bodyText).toContain("kora221");
    expect(bodyText).not.toContain("email");
    expect(bodyText).not.toContain("phone");
    expect(bodyText).not.toContain("wallet");
    expect(bodyText).not.toContain("ledger");
    expect(bodyText).not.toContain("payment");
  });

  it("hides private public profiles with not found", async () => {
    playerMocks.getPublicPlayerProfile.mockResolvedValueOnce({ type: "private" });

    const res = await app.request("/v1/players/private-user");

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("404_PLAYER_NOT_FOUND");
  });
});
