import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

const dbMocks = vi.hoisted(() => ({
  prisma: {
    authSession: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

const securityMocks = vi.hoisted(() => ({
  listComplianceGates: vi.fn(),
  createModerationAction: vi.fn(),
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
    listComplianceGates: securityMocks.listComplianceGates,
    createModerationAction: securityMocks.createModerationAction,
  };
});

import { SESSION_COOKIE_NAME, hashOpaqueToken } from "../../auth/session.js";
import type { AuthVariables } from "../../auth/session.js";
import adminSecurity from "../admin/security.js";

function createApp() {
  const app = new Hono<{ Variables: AuthVariables }>();
  app.route("/v1/admin", adminSecurity);
  return app;
}

function validAuthSession(role: "PLAYER" | "SUPPORT" | "ADMIN" | "SUPER_ADMIN" = "ADMIN") {
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

describe("admin security routes", () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.prisma.authSession.findUnique.mockResolvedValue(validAuthSession());
    securityMocks.listComplianceGates.mockResolvedValue([
      { type: "WITHDRAWAL", scope: "global", status: "BLOCKED" },
    ]);
    securityMocks.createModerationAction.mockResolvedValue({ id: "moderation-1" });
  });

  it("lists compliance gates for admin users", async () => {
    const res = await app.request("/v1/admin/compliance/gates", {
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` },
    });

    expect(res.status).toBe(200);
    expect(securityMocks.listComplianceGates).toHaveBeenCalled();
  });

  it("requires role and reason for moderation actions", async () => {
    const res = await app.request("/v1/admin/moderation/actions", {
      method: "POST",
      body: JSON.stringify({
        type: "WARN_USER",
        targetUserId: "player-1",
        reason: "abusive chat",
      }),
      headers: {
        "content-type": "application/json",
        cookie: `${SESSION_COOKIE_NAME}=session-token`,
      },
    });

    expect(res.status).toBe(201);
    expect(securityMocks.createModerationAction).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "admin-1",
        data: expect.objectContaining({ reason: "abusive chat" }),
      }),
    );
  });

  it("refuses player moderation actions", async () => {
    dbMocks.prisma.authSession.findUnique.mockResolvedValueOnce(validAuthSession("PLAYER"));

    const res = await app.request("/v1/admin/moderation/actions", {
      method: "POST",
      body: JSON.stringify({
        type: "WARN_USER",
        targetUserId: "player-1",
        reason: "abusive chat",
      }),
      headers: {
        "content-type": "application/json",
        cookie: `${SESSION_COOKIE_NAME}=session-token`,
      },
    });

    expect(res.status).toBe(403);
  });
});
