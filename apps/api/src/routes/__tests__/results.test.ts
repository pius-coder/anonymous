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

const resultMocks = vi.hoisted(() => ({
  getSessionResultsForPlayer: vi.fn(),
}));

vi.mock("@session-jeu/db", () => ({
  prisma: dbMocks.prisma,
  Prisma: {
    TransactionIsolationLevel: { Serializable: "Serializable" },
  },
  DisputeWindowStatus: {
    OPEN: "OPEN",
    CORRECTION_REQUESTED: "CORRECTION_REQUESTED",
  },
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
  PrizeDistributionStatus: {
    PENDING: "PENDING",
    CREDITED: "CREDITED",
  },
  RoundingRemainderPolicy: {
    FIRST_WINNER: "FIRST_WINNER",
    PLATFORM_COMMISSION: "PLATFORM_COMMISSION",
  },
  RoundOutcomeStatus: {
    ELIMINATED: "ELIMINATED",
  },
  SessionRegistrationStatus: {
    PAYMENT_PENDING: "PAYMENT_PENDING",
    PAID: "PAID",
  },
}));

vi.mock("../../results/results.js", async () => {
  const actual = await vi.importActual<typeof import("../../results/results.js")>(
    "../../results/results.js",
  );
  return {
    ...actual,
    ...resultMocks,
  };
});

import { SESSION_COOKIE_NAME, hashOpaqueToken } from "../../auth/session.js";
import type { AuthVariables } from "../../auth/session.js";
import results from "../results.js";

function createApp() {
  const app = new Hono<{ Variables: AuthVariables }>();
  app.route("/v1", results);
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

describe("player results routes", () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.prisma.authSession.findUnique.mockResolvedValue(validAuthSession());
    resultMocks.getSessionResultsForPlayer.mockResolvedValue({
      type: "ok",
      session: { id: "session-1" },
      results: [{ userId: "player-1", finalRank: 1, prizeWonXaf: 1000 }],
      distributions: [{ userId: "player-1", amountXaf: 1000 }],
      disputeWindow: { status: "OPEN" },
    });
  });

  it("returns authorized player recap", async () => {
    const res = await app.request("/v1/sessions/session-1/results", {
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.results[0].userId).toBe("player-1");
    expect(resultMocks.getSessionResultsForPlayer).toHaveBeenCalledWith({
      sessionId: "session-1",
      userId: "player-1",
    });
  });

  it("hides results from non participants", async () => {
    resultMocks.getSessionResultsForPlayer.mockResolvedValueOnce({ type: "forbidden" });

    const res = await app.request("/v1/sessions/session-1/results", {
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` },
    });

    expect(res.status).toBe(403);
  });
});
