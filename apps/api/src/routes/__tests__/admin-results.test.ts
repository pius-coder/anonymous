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
  finalizeSessionResults: vi.fn(),
  getSessionResultsForAdmin: vi.fn(),
  requestResultsCorrection: vi.fn(),
}));

const queueMocks = vi.hoisted(() => ({
  scheduleCreditsDistribution: vi.fn(),
}));

const playerMocks = vi.hoisted(() => ({
  recomputeSessionPlayerStats: vi.fn(),
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
    CHECKED_IN: "CHECKED_IN",
    IN_ROOM: "IN_ROOM",
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

vi.mock("../../queues/creditsDistribution.js", () => queueMocks);

vi.mock("../../players/playerProfile.js", () => playerMocks);

import { SESSION_COOKIE_NAME, hashOpaqueToken } from "../../auth/session.js";
import type { AuthVariables } from "../../auth/session.js";
import adminResults from "../admin/results.js";

function createApp() {
  const app = new Hono<{ Variables: AuthVariables }>();
  app.route("/v1/admin", adminResults);
  return app;
}

function validAuthSession(role: "PLAYER" | "ADMIN" | "SUPER_ADMIN" | "SUPPORT" = "ADMIN") {
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

describe("admin results routes", () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.prisma.authSession.findUnique.mockResolvedValue(validAuthSession());
    resultMocks.finalizeSessionResults.mockResolvedValue({
      type: "ok",
      sessionId: "session-1",
      commission: { id: "commission-1" },
      winnerCount: 1,
    });
    resultMocks.getSessionResultsForAdmin.mockResolvedValue({
      type: "ok",
      session: { id: "session-1" },
      results: [],
      distributions: [],
      commission: { prizePoolXaf: 1000 },
      disputeWindow: null,
    });
    resultMocks.requestResultsCorrection.mockResolvedValue({
      type: "ok",
      disputeWindow: {
        id: "dispute-1",
        status: "CORRECTION_REQUESTED",
        requestReason: "score dispute",
        requestedById: "admin-1",
        requestedAt: new Date("2026-07-08T00:00:00Z"),
      },
    });
    playerMocks.recomputeSessionPlayerStats.mockResolvedValue([]);
  });

  it("finalizes a session and schedules credit distribution", async () => {
    const res = await app.request("/v1/admin/sessions/session-1/finalize", {
      method: "POST",
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=session-token`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ tiePolicy: "USER_ID_ASC", reason: "session completed" }),
    });

    expect(res.status).toBe(201);
    expect(resultMocks.finalizeSessionResults).toHaveBeenCalledWith({
      sessionId: "session-1",
      adminUserId: "admin-1",
      tiePolicy: "USER_ID_ASC",
      remainderPolicy: "FIRST_WINNER",
      reason: "session completed",
    });
    expect(playerMocks.recomputeSessionPlayerStats).toHaveBeenCalledWith("session-1");
    expect(queueMocks.scheduleCreditsDistribution).toHaveBeenCalledWith({ sessionId: "session-1" });
  });

  it("returns tie policy validation as 422", async () => {
    resultMocks.finalizeSessionResults.mockResolvedValueOnce({ type: "tie-policy-required" });

    const res = await app.request("/v1/admin/sessions/session-1/finalize", {
      method: "POST",
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=session-token`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ reason: "session completed" }),
    });

    expect(res.status).toBe(422);
    expect(playerMocks.recomputeSessionPlayerStats).not.toHaveBeenCalled();
    expect(queueMocks.scheduleCreditsDistribution).not.toHaveBeenCalled();
  });

  it("rejects non-admin finalize attempts", async () => {
    dbMocks.prisma.authSession.findUnique.mockResolvedValue(validAuthSession("PLAYER"));

    const res = await app.request("/v1/admin/sessions/session-1/finalize", {
      method: "POST",
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=session-token`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ reason: "session completed" }),
    });

    expect(res.status).toBe(403);
    expect(resultMocks.finalizeSessionResults).not.toHaveBeenCalled();
  });

  it("requires a correction reason and audits through service", async () => {
    dbMocks.prisma.authSession.findUnique.mockResolvedValue(validAuthSession("SUPPORT"));

    const res = await app.request("/v1/admin/sessions/session-1/correction-request", {
      method: "POST",
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=session-token`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ reason: "score dispute" }),
    });

    expect(res.status).toBe(200);
    expect(resultMocks.requestResultsCorrection).toHaveBeenCalledWith({
      sessionId: "session-1",
      adminUserId: "admin-1",
      reason: "score dispute",
    });
  });
});
