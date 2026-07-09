import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

const dbMocks = vi.hoisted(() => ({
  prisma: {
    authSession: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    gameSession: {
      findFirst: vi.fn(),
    },
  },
}));

const liveMocks = vi.hoisted(() => ({
  createLiveReservation: vi.fn(),
  getLiveStateForPlayer: vi.fn(),
  getGameWsEndpoint: vi.fn(),
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
import live from "../live.js";

function createApp() {
  const app = new Hono<{ Variables: AuthVariables }>();
  app.route("/v1/live", live);
  return app;
}

function validAuthSession() {
  return {
    id: "auth-session-1",
    tokenHash: hashOpaqueToken("session-token"),
    sessionVersion: 1,
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    user: {
      id: "player-1",
      email: "player@example.com",
      name: "Player",
      role: "PLAYER",
      isActive: true,
      sessionVersion: 1,
    },
  };
}

function liveState(overrides: Record<string, unknown> = {}) {
  const now = new Date("2026-07-08T00:00:00Z");
  return {
    id: "live-state-1",
    sessionId: "session-1",
    roomId: "room-1",
    phase: "BRIEFING",
    previousPhase: null,
    currentRoundId: null,
    phaseStartedAt: now,
    pausedAt: null,
    pauseReason: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("live routes", () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.prisma.authSession.findUnique.mockResolvedValue(validAuthSession());
    dbMocks.prisma.gameSession.findFirst.mockResolvedValue({
      id: "session-1",
      code: "SESSION-1",
    });
    liveMocks.getGameWsEndpoint.mockReturnValue("ws://game.example.test");
    liveMocks.createLiveReservation.mockResolvedValue({
      type: "ok",
      liveToken: "live-token",
      reservation: {
        id: "reservation-1",
        expiresAt: new Date("2026-07-08T00:01:00Z"),
      },
      liveState: liveState(),
    });
    liveMocks.getLiveStateForPlayer.mockResolvedValue({
      type: "ok",
      liveState: {
        ...liveState({
          currentRound: {
            id: "round-1",
            roundNum: 1,
            status: "ACTIVE",
            startTime: new Date("2026-07-08T00:00:00Z"),
            endTime: null,
          },
        }),
      },
      deadline: {
        deadlineAt: new Date("2026-07-08T00:00:30Z"),
        closedAt: null,
      },
      players: [
        {
          userId: "player-1",
          status: "CONNECTED",
          lastSeenAt: new Date("2026-07-08T00:00:01Z"),
          disconnectedAt: null,
          reconnectUntil: null,
        },
      ],
    });
  });

  it("creates a live reservation from a valid join token", async () => {
    const res = await app.request("/v1/live/sessions/session-1/reservation", {
      method: "POST",
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=session-token`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ joinToken: "join-token-value" }),
    });

    expect(res.status).toBe(200);
    expect(liveMocks.createLiveReservation).toHaveBeenCalledWith({
      userId: "player-1",
      sessionId: "session-1",
      joinToken: "join-token-value",
    });
    const body = (await res.json()) as { data: { websocket: { roomName: string } } };
    expect(body.data.websocket.roomName).toBe("game_session");
  });

  it("resolves public session code before creating live reservation", async () => {
    const res = await app.request("/v1/live/sessions/SESSION-1/reservation", {
      method: "POST",
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=session-token`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ joinToken: "join-token-value" }),
    });

    expect(res.status).toBe(200);
    expect(liveMocks.createLiveReservation).toHaveBeenCalledWith({
      userId: "player-1",
      sessionId: "session-1",
      joinToken: "join-token-value",
    });
  });

  it("rejects live reservation when session is not live", async () => {
    liveMocks.createLiveReservation.mockResolvedValue({ type: "session-not-live" });

    const res = await app.request("/v1/live/sessions/session-1/reservation", {
      method: "POST",
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=session-token`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ joinToken: "join-token-value" }),
    });

    expect(res.status).toBe(409);
  });

  it("returns sanitized live state for checked-in player", async () => {
    const res = await app.request("/v1/live/session-1/state", {
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { currentRound: { id: string } } };
    expect(body.data.currentRound.id).toBe("round-1");
  });
});
