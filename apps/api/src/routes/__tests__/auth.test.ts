import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

const dbMocks = vi.hoisted(() => {
  const tx = {
    user: {
      create: vi.fn(),
      update: vi.fn(),
    },
    authSession: {
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    passwordResetToken: {
      create: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  };

  return {
    tx,
    prisma: {
      user: {
        findUnique: vi.fn(),
      },
      playerProfile: {
        findUnique: vi.fn(),
      },
      authSession: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      passwordResetToken: {
        findUnique: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      $transaction: vi.fn(),
    },
  };
});

vi.mock("@session-jeu/db", () => ({
  prisma: dbMocks.prisma,
}));

import { hashPassword } from "../../auth/password.js";
import { resetAuthRateLimits } from "../../auth/rateLimit.js";
import {
  SESSION_COOKIE_NAME,
  hashOpaqueToken,
  requireAuth,
  requireRole,
} from "../../auth/session.js";
import type { AuthVariables } from "../../auth/session.js";
import auth from "../auth.js";
import me from "../me.js";

function createApp() {
  const app = new Hono<{ Variables: AuthVariables }>();
  app.route("/v1/auth", auth);
  app.route("/v1/me", me);
  app.get("/v1/admin/probe", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), (c) =>
    c.json({ success: true }),
  );
  return app;
}

function validSession(role: "PLAYER" | "ADMIN" | "SUPER_ADMIN" = "PLAYER") {
  return {
    id: "session-1",
    userId: "user-1",
    tokenHash: hashOpaqueToken("session-token"),
    sessionVersion: 1,
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    user: {
      id: "user-1",
      email: "player@example.com",
      name: "Player",
      role,
      isActive: true,
      sessionVersion: 1,
    },
  };
}

describe("auth routes", () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
    resetAuthRateLimits();
    dbMocks.prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof dbMocks.tx) => unknown) => callback(dbMocks.tx),
    );
    dbMocks.tx.authSession.create.mockResolvedValue({
      id: "created-session",
      expiresAt: new Date(Date.now() + 60_000),
    });
    dbMocks.tx.auditLog.create.mockResolvedValue({});
    dbMocks.tx.passwordResetToken.create.mockResolvedValue({});
    dbMocks.tx.passwordResetToken.update.mockResolvedValue({});
    dbMocks.tx.authSession.updateMany.mockResolvedValue({ count: 1 });
    dbMocks.tx.user.update.mockResolvedValue({});
    dbMocks.prisma.auditLog.create.mockResolvedValue({});
    dbMocks.prisma.authSession.create.mockResolvedValue({
      id: "created-session",
      expiresAt: new Date(Date.now() + 60_000),
    });
    dbMocks.prisma.authSession.update.mockResolvedValue({});
    dbMocks.prisma.authSession.updateMany.mockResolvedValue({ count: 1 });
  });

  it("registers a player, hashes the password, creates a session and sets a secure cookie", async () => {
    dbMocks.prisma.user.findUnique.mockResolvedValue(null);
    dbMocks.prisma.playerProfile.findUnique.mockResolvedValue(null);
    dbMocks.tx.user.create.mockResolvedValue({
      id: "user-1",
      email: "player@example.com",
      name: "Player",
      role: "PLAYER",
      sessionVersion: 1,
    });

    const res = await app.request("/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "Player@Example.com",
        password: "CorrectHorse2026!",
        username: "player_2026",
        name: "Player",
      }),
      headers: { "content-type": "application/json" },
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.success).toBe(true);
    expect(JSON.stringify(body)).not.toContain("passwordHash");

    const createdUser = dbMocks.tx.user.create.mock.calls[0][0].data;
    expect(createdUser.passwordHash).not.toBe("CorrectHorse2026!");
    expect(createdUser.passwordHash.startsWith("scrypt$1$")).toBe(true);
    expect(dbMocks.tx.authSession.create).toHaveBeenCalled();
    expect(dbMocks.tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "auth.user-created" }),
      }),
    );

    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/");
  });

  it("rejects duplicate register email", async () => {
    dbMocks.prisma.user.findUnique.mockResolvedValueOnce({ id: "existing-user" });
    dbMocks.prisma.playerProfile.findUnique.mockResolvedValue(null);

    const res = await app.request("/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "player@example.com",
        password: "CorrectHorse2026!",
        username: "player_2026",
      }),
      headers: { "content-type": "application/json" },
    });

    expect(res.status).toBe(409);
    const body = (await res.json()) as Record<
      string,
      { code: string; details?: { email?: string[]; fields?: { email?: string[] } } }
    >;
    expect(body.error.code).toBe("EMAIL_ALREADY_USED");
    expect(body.error.details?.email?.[0]).toContain("email");
    expect(body.error.details?.fields?.email?.[0]).toContain("email");
  });

  it("returns granular validation details on invalid register payload", async () => {
    const res = await app.request("/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "not-an-email",
        password: "short",
        username: "x",
      }),
      headers: { "content-type": "application/json" },
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<
      string,
      { code: string; details?: { fields?: Record<string, string[]>; email?: string[] } }
    >;
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details?.fields?.email?.[0]).toBeTruthy();
    expect(body.error.details?.fields?.password?.[0]).toBeTruthy();
    expect(body.error.details?.fields?.username?.[0]).toBeTruthy();
    expect(body.error.details?.email?.[0]).toBe(body.error.details?.fields?.email?.[0]);
  });

  it("logs in with valid credentials and rotates any incoming session token", async () => {
    const passwordHash = await hashPassword("CorrectHorse2026!");
    dbMocks.prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "player@example.com",
      name: "Player",
      role: "PLAYER",
      passwordHash,
      isActive: true,
      sessionVersion: 1,
    });

    const res = await app.request("/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "player@example.com",
        password: "CorrectHorse2026!",
      }),
      headers: {
        "content-type": "application/json",
        cookie: `${SESSION_COOKIE_NAME}=old-token`,
      },
    });

    expect(res.status).toBe(200);
    expect(dbMocks.prisma.authSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tokenHash: hashOpaqueToken("old-token") }),
      }),
    );
    expect(dbMocks.prisma.authSession.create).toHaveBeenCalled();
    expect(res.headers.get("set-cookie")).not.toContain("old-token");
  });

  it("rejects invalid login passwords and inactive accounts", async () => {
    const passwordHash = await hashPassword("CorrectHorse2026!");
    dbMocks.prisma.user.findUnique.mockResolvedValueOnce({
      id: "user-1",
      email: "player@example.com",
      name: "Player",
      role: "PLAYER",
      passwordHash,
      isActive: true,
      sessionVersion: 1,
    });

    const badPassword = await app.request("/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "player@example.com",
        password: "WrongHorse2026!",
      }),
      headers: { "content-type": "application/json" },
    });
    expect(badPassword.status).toBe(401);

    dbMocks.prisma.user.findUnique.mockResolvedValueOnce({
      id: "user-1",
      email: "player@example.com",
      name: "Player",
      role: "PLAYER",
      passwordHash,
      isActive: false,
      sessionVersion: 1,
    });

    const inactive = await app.request("/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "player@example.com",
        password: "CorrectHorse2026!",
      }),
      headers: { "content-type": "application/json" },
    });
    expect(inactive.status).toBe(403);
  });

  it("rate limits repeated login attempts", async () => {
    dbMocks.prisma.user.findUnique.mockResolvedValue(null);

    for (let index = 0; index < 5; index += 1) {
      const res = await app.request("/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "player@example.com",
          password: "WrongHorse2026!",
        }),
        headers: { "content-type": "application/json" },
      });
      expect(res.status).toBe(401);
    }

    const limited = await app.request("/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "player@example.com",
        password: "WrongHorse2026!",
      }),
      headers: { "content-type": "application/json" },
    });

    expect(limited.status).toBe(429);
  });

  it("returns the current user from /v1/me with a valid session", async () => {
    dbMocks.prisma.authSession.findUnique.mockResolvedValue(validSession());

    const res = await app.request("/v1/me", {
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, { user: { id: string; role: string } }>;
    expect(body.data.user.id).toBe("user-1");
    expect(body.data.user.role).toBe("PLAYER");
  });

  it("rejects invalid logout sessions and revokes valid logout sessions", async () => {
    const invalid = await app.request("/v1/auth/logout", { method: "POST" });
    expect(invalid.status).toBe(401);

    dbMocks.prisma.authSession.findUnique.mockResolvedValue(validSession());
    const valid = await app.request("/v1/auth/logout", {
      method: "POST",
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` },
    });

    expect(valid.status).toBe(200);
    expect(dbMocks.prisma.authSession.update).toHaveBeenCalledWith({
      where: { id: "session-1" },
      data: { revokedAt: expect.any(Date) },
    });
    expect(valid.headers.get("set-cookie")).toContain(`${SESSION_COOKIE_NAME}=`);
  });

  it("enforces RBAC middleware for admin-only routes", async () => {
    dbMocks.prisma.authSession.findUnique.mockResolvedValueOnce(validSession("PLAYER"));
    const player = await app.request("/v1/admin/probe", {
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` },
    });
    expect(player.status).toBe(403);

    dbMocks.prisma.authSession.findUnique.mockResolvedValueOnce(validSession("ADMIN"));
    const admin = await app.request("/v1/admin/probe", {
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` },
    });
    expect(admin.status).toBe(200);
  });

  it("creates password reset tokens without exposing account existence", async () => {
    dbMocks.prisma.user.findUnique.mockResolvedValue({ id: "user-1", isActive: true });

    const res = await app.request("/v1/auth/password/request-reset", {
      method: "POST",
      body: JSON.stringify({ email: "player@example.com" }),
      headers: { "content-type": "application/json" },
    });

    expect(res.status).toBe(200);
    expect(dbMocks.tx.passwordResetToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          tokenHash: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      }),
    );

    const body = (await res.json()) as Record<string, unknown>;
    expect(JSON.stringify(body)).not.toContain("resetToken");
  });

  it("resets a password, marks the token used, and revokes active sessions", async () => {
    const token = "a".repeat(32);
    dbMocks.prisma.passwordResetToken.findUnique.mockResolvedValue({
      id: "reset-1",
      tokenHash: hashOpaqueToken(token),
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user: { id: "user-1", isActive: true },
    });

    const res = await app.request("/v1/auth/password/reset", {
      method: "POST",
      body: JSON.stringify({
        token,
        password: "NewCorrectHorse2026!",
      }),
      headers: { "content-type": "application/json" },
    });

    expect(res.status).toBe(200);
    expect(dbMocks.tx.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        passwordHash: expect.stringMatching(/^scrypt\$1\$/),
        sessionVersion: { increment: 1 },
      },
    });
    expect(dbMocks.tx.passwordResetToken.update).toHaveBeenCalledWith({
      where: { id: "reset-1" },
      data: { usedAt: expect.any(Date) },
    });
    expect(dbMocks.tx.authSession.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("rejects used and expired password reset tokens", async () => {
    const token = "a".repeat(32);
    dbMocks.prisma.passwordResetToken.findUnique.mockResolvedValueOnce({
      id: "reset-1",
      usedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      user: { id: "user-1", isActive: true },
    });

    const used = await app.request("/v1/auth/password/reset", {
      method: "POST",
      body: JSON.stringify({ token, password: "NewCorrectHorse2026!" }),
      headers: { "content-type": "application/json" },
    });
    expect(used.status).toBe(400);

    dbMocks.prisma.passwordResetToken.findUnique.mockResolvedValueOnce({
      id: "reset-2",
      usedAt: null,
      expiresAt: new Date(Date.now() - 60_000),
      user: { id: "user-1", isActive: true },
    });

    const expired = await app.request("/v1/auth/password/reset", {
      method: "POST",
      body: JSON.stringify({ token, password: "NewCorrectHorse2026!" }),
      headers: { "content-type": "application/json" },
    });
    expect(expired.status).toBe(400);
  });
});
