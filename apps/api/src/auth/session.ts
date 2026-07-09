import type { Context, MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@session-jeu/db";
import { errorResponse } from "../lib/responses.js";

export type UserRoleValue = "PLAYER" | "SUPPORT" | "FINANCE" | "ADMIN" | "SUPER_ADMIN";

export const ALLOW_INSECURE_AUTH_COOKIE = process.env.ALLOW_INSECURE_AUTH_COOKIE === "true";
// Production-ready default: Secure + __Host- cookie. Local HTTP development must
// opt out explicitly with ALLOW_INSECURE_AUTH_COOKIE=true.
export const SESSION_COOKIE_NAME = ALLOW_INSECURE_AUTH_COOKIE ? "session" : "__Host-session";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: UserRoleValue;
  sessionId: string;
};

export type AuthVariables = {
  user: AuthUser;
};

type SessionWritable = {
  authSession: {
    create: (args: {
      data: {
        userId: string;
        tokenHash: string;
        sessionVersion: number;
        expiresAt: Date;
        ipAddress?: string;
        userAgent?: string;
      };
    }) => Promise<{ id: string; expiresAt: Date }>;
    update?: (args: { where: { id: string }; data: { revokedAt?: Date } }) => Promise<unknown>;
    updateMany?: (args: {
      where: { userId?: string; tokenHash?: string; revokedAt?: null };
      data: { revokedAt: Date };
    }) => Promise<unknown>;
  };
};

export function createOpaqueToken() {
  return randomBytes(32).toString("base64url");
}

export function hashOpaqueToken(token: string) {
  return createHash("sha256").update(token).digest("base64url");
}

export function getClientIp(c: Context) {
  return c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || c.req.header("x-real-ip");
}

export function getUserAgent(c: Context) {
  return c.req.header("user-agent");
}

export function getRequestId(c: Context) {
  return c.get("requestId" as never) as string | undefined;
}

export function setSessionCookie(c: Context, token: string, expiresAt: Date) {
  setCookie(c, SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: !ALLOW_INSECURE_AUTH_COOKIE,
    sameSite: "Lax",
    path: "/",
    expires: expiresAt,
    maxAge: Math.floor((expiresAt.getTime() - Date.now()) / 1000),
  });
}

export function clearSessionCookie(c: Context) {
  deleteCookie(c, SESSION_COOKIE_NAME, {
    path: "/",
    secure: !ALLOW_INSECURE_AUTH_COOKIE,
    sameSite: "Lax",
  });
}

export async function createAuthSession(
  c: Context,
  db: SessionWritable,
  user: { id: string; sessionVersion: number },
) {
  const token = createOpaqueToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const session = await db.authSession.create({
    data: {
      userId: user.id,
      tokenHash: hashOpaqueToken(token),
      sessionVersion: user.sessionVersion,
      expiresAt,
      ipAddress: getClientIp(c),
      userAgent: getUserAgent(c),
    },
  });

  setSessionCookie(c, token, expiresAt);
  return { token, sessionId: session.id, expiresAt: session.expiresAt };
}

export async function revokeSessionToken(db: SessionWritable, token: string) {
  const tokenHash = hashOpaqueToken(token);
  await db.authSession.updateMany?.({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeSessionFromRequest(c: Context, db: SessionWritable) {
  const token = getCookie(c, SESSION_COOKIE_NAME);
  if (!token) return;
  await revokeSessionToken(db, token);
}

export const requireAuth: MiddlewareHandler<{ Variables: AuthVariables }> = async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE_NAME);
  if (!token) {
    clearSessionCookie(c);
    return errorResponse(c, 401, "UNAUTHENTICATED", "Authentication is required");
  }

  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashOpaqueToken(token) },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          sessionVersion: true,
        },
      },
    },
  });

  if (
    !session ||
    session.revokedAt ||
    session.expiresAt <= new Date() ||
    !session.user.isActive ||
    session.sessionVersion !== session.user.sessionVersion
  ) {
    if (session && !session.revokedAt) {
      await prisma.authSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
    }
    clearSessionCookie(c);
    return errorResponse(c, 401, "INVALID_SESSION", "Session is invalid or expired");
  }

  c.set("user", {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role as UserRoleValue,
    sessionId: session.id,
  });

  await next();
};

export function requireRole(
  ...allowedRoles: UserRoleValue[]
): MiddlewareHandler<{ Variables: AuthVariables }> {
  return async (c, next) => {
    const user = c.get("user");
    if (!allowedRoles.includes(user.role)) {
      return errorResponse(c, 403, "ROLE_REQUIRED", "Insufficient role for this action");
    }
    await next();
  };
}
