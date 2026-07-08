import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

const dbMocks = vi.hoisted(() => ({
  prisma: {
    authSession: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

const notificationMocks = vi.hoisted(() => ({
  createSessionShareMessage: vi.fn(),
  adminShareParamsSchema: undefined as unknown,
}));

vi.mock("@session-jeu/db", () => ({
  prisma: dbMocks.prisma,
}));

vi.mock("../../notifications/notifications.js", async () => {
  const actual = await vi.importActual<typeof import("../../notifications/notifications.js")>(
    "../../notifications/notifications.js",
  );
  return {
    ...actual,
    createSessionShareMessage: notificationMocks.createSessionShareMessage,
  };
});

import { SESSION_COOKIE_NAME, hashOpaqueToken } from "../../auth/session.js";
import type { AuthVariables } from "../../auth/session.js";
import adminNotifications from "../admin/notifications.js";

function createApp() {
  const app = new Hono<{ Variables: AuthVariables }>();
  app.route("/v1/admin", adminNotifications);
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
      id: `${role.toLowerCase()}-1`,
      email: `${role.toLowerCase()}@example.com`,
      name: role,
      role,
      isActive: true,
      sessionVersion: 1,
    },
  };
}

describe("admin notification routes", () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.prisma.authSession.findUnique.mockResolvedValue(validAuthSession());
    notificationMocks.createSessionShareMessage.mockResolvedValue({
      type: "ok",
      message: "Session Jeu: Finale (ABC123). Rejoindre: https://example.com/share",
      shareUrl: "https://example.com/share",
      shareLink: { id: "share-1", token: "token", sessionId: "session-1" },
    });
  });

  it("creates a private-safe admin share message", async () => {
    const res = await app.request("/v1/admin/notifications/session/session-1/share", {
      method: "POST",
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` },
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.message).not.toMatch(/email|phone|score|wallet|payment/i);
  });

  it("refuses private sessions without leaking message data", async () => {
    notificationMocks.createSessionShareMessage.mockResolvedValueOnce({ type: "private" });

    const res = await app.request("/v1/admin/notifications/session/session-1/share", {
      method: "POST",
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` },
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("SESSION_PRIVATE");
  });

  it("refuses player access", async () => {
    dbMocks.prisma.authSession.findUnique.mockResolvedValueOnce(validAuthSession("PLAYER"));

    const res = await app.request("/v1/admin/notifications/session/session-1/share", {
      method: "POST",
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` },
    });

    expect(res.status).toBe(403);
    expect(notificationMocks.createSessionShareMessage).not.toHaveBeenCalled();
  });
});
