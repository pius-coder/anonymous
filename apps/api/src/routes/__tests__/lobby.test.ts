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
  getLobbyForPlayer: vi.fn(),
  checkInPlayer: vi.fn(),
  issueJoinToken: vi.fn(),
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
    PAID: "PAID",
    CHECKED_IN: "CHECKED_IN",
    IN_ROOM: "IN_ROOM",
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
import lobby from "../lobby.js";

function createApp() {
  const app = new Hono<{ Variables: AuthVariables }>();
  app.route("/v1", lobby);
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

function session() {
  return {
    id: "session-1",
    code: "SESSION-1",
    name: "Session",
    description: null,
    status: "ACTIVE",
    minPlayers: 2,
    maxPlayers: 10,
    startTime: new Date("2026-07-08T00:10:00Z"),
    registrationClosesAt: null,
    cancelledAt: null,
  };
}

function registration(overrides: Record<string, unknown> = {}) {
  const now = new Date("2026-07-08T00:00:00Z");
  return {
    id: "registration-1",
    userId: "player-1",
    sessionId: "session-1",
    status: "PAID",
    paymentDeadlineAt: null,
    paidAt: now,
    checkedInAt: null,
    inRoomAt: null,
    noShowAt: null,
    cancelledAt: null,
    cancellationReason: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("lobby routes", () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.prisma.authSession.findUnique.mockResolvedValue(validAuthSession());
    lobbyMocks.getLobbyForPlayer.mockResolvedValue({
      type: "ok",
      session: session(),
      registration: registration(),
      presence: { available: true, count: 1, ttlSeconds: 60 },
    });
    lobbyMocks.checkInPlayer.mockResolvedValue({
      type: "ok",
      registration: registration({ status: "CHECKED_IN", checkedInAt: new Date() }),
      checkInDeadlineAt: new Date("2026-07-08T00:15:00Z"),
    });
    lobbyMocks.issueJoinToken.mockResolvedValue({
      type: "ok",
      token: "join-token",
      record: {
        id: "token-1",
        userId: "player-1",
        sessionId: "session-1",
        registrationId: "registration-1",
        expiresAt: new Date("2026-07-08T00:02:00Z"),
        consumedAt: null,
        createdAt: new Date("2026-07-08T00:00:00Z"),
      },
    });
  });

  it("returns lobby for a paid player", async () => {
    const res = await app.request("/v1/sessions/session-1/lobby", {
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` },
    });

    expect(res.status).toBe(200);
    expect(lobbyMocks.getLobbyForPlayer).toHaveBeenCalledWith({
      userId: "player-1",
      sessionId: "session-1",
    });
  });

  it("rejects lobby access for unpaid player", async () => {
    lobbyMocks.getLobbyForPlayer.mockResolvedValue({ type: "not-paid" });

    const res = await app.request("/v1/sessions/session-1/lobby", {
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` },
    });

    expect(res.status).toBe(403);
  });

  it("checks in idempotently", async () => {
    lobbyMocks.checkInPlayer.mockResolvedValue({
      type: "idempotent",
      registration: registration({ status: "CHECKED_IN", checkedInAt: new Date() }),
      checkInDeadlineAt: new Date("2026-07-08T00:15:00Z"),
    });

    const res = await app.request("/v1/sessions/session-1/check-in", {
      method: "POST",
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` },
    });

    expect(res.status).toBe(200);
  });

  it("rejects late check-in", async () => {
    lobbyMocks.checkInPlayer.mockResolvedValue({
      type: "checkin-closed",
      checkInDeadlineAt: new Date("2026-07-08T00:15:00Z"),
    });

    const res = await app.request("/v1/sessions/session-1/check-in", {
      method: "POST",
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` },
    });

    expect(res.status).toBe(409);
  });

  it("returns join token for checked-in player", async () => {
    const res = await app.request("/v1/sessions/session-1/join-token", {
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { joinToken: { token: string } } };
    expect(body.data.joinToken.token).toBe("join-token");
  });
});
