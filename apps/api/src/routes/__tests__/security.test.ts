import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

const dbMocks = vi.hoisted(() => ({
  prisma: {
    authSession: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

const securityMocks = vi.hoisted(() => ({
  getSessionRisk: vi.fn(),
  createSupportDispute: vi.fn(),
}));

vi.mock("@session-jeu/db", () => ({
  prisma: dbMocks.prisma,
}));

vi.mock("../../security/security.js", async () => {
  const actual = await vi.importActual<typeof import("../../security/security.js")>(
    "../../security/security.js",
  );
  return {
    ...actual,
    getSessionRisk: securityMocks.getSessionRisk,
    createSupportDispute: securityMocks.createSupportDispute,
  };
});

import { SESSION_COOKIE_NAME, hashOpaqueToken } from "../../auth/session.js";
import type { AuthVariables } from "../../auth/session.js";
import { resetRateLimitBuckets } from "../../middleware/rateLimit.js";
import security from "../security.js";

function createApp() {
  const app = new Hono<{ Variables: AuthVariables }>();
  app.route("/v1", security);
  return app;
}

function validAuthSession(role: "PLAYER" | "SUPPORT" | "ADMIN" | "SUPER_ADMIN" = "PLAYER") {
  return {
    id: "auth-session-1",
    tokenHash: hashOpaqueToken("session-token"),
    sessionVersion: 1,
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    user: {
      id: `${role.toLowerCase()}-1`,
      email: `${role.toLowerCase()}@example.com`,
      name: role,
      role,
      isActive: true,
      sessionVersion: 1,
    },
  };
}

describe("security routes", () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimitBuckets();
    dbMocks.prisma.authSession.findUnique.mockResolvedValue(validAuthSession());
    securityMocks.getSessionRisk.mockResolvedValue({ sessionId: "session-1", riskScore: 0 });
    securityMocks.createSupportDispute.mockResolvedValue({ id: "case-1" });
  });

  it("refuses player access to session risk", async () => {
    const res = await app.request("/v1/security/session/session-1/risk", {
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` },
    });

    expect(res.status).toBe(403);
  });

  it("allows support to view session risk", async () => {
    dbMocks.prisma.authSession.findUnique.mockResolvedValueOnce(validAuthSession("SUPPORT"));

    const res = await app.request("/v1/security/session/session-1/risk", {
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` },
    });

    expect(res.status).toBe(200);
  });

  it("creates a player dispute with audit reason", async () => {
    const res = await app.request("/v1/support/disputes", {
      method: "POST",
      body: JSON.stringify({
        sessionId: "session-1",
        subject: "Round issue",
        description: "My action was not counted",
        reason: "player dispute",
      }),
      headers: {
        "content-type": "application/json",
        cookie: `${SESSION_COOKIE_NAME}=session-token`,
      },
    });

    expect(res.status).toBe(201);
    expect(securityMocks.createSupportDispute).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "player-1",
        data: expect.objectContaining({ reason: "player dispute" }),
      }),
    );
  });
});
