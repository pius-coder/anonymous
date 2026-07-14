import type { Context, Next } from "hono";
import { AUTH_ERRORS } from "@session-jeu/shared";
import { authRepository } from "@session-jeu/db";
import { readSessionCookie, hashOpaqueToken, clearSessionCookieValue } from "../auth/session.js";

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  roles: string[];
  sessionVersion: number;
  createdAt: string;
};

export async function requireAuth(c: Context, next: Next): Promise<Response | void> {
  const token = readSessionCookie(c);
  if (!token) {
    return c.json({ success: false, error: { code: AUTH_ERRORS.UNAUTHORIZED.code, message: AUTH_ERRORS.UNAUTHORIZED.message } }, 401);
  }

  const tokenHash = hashOpaqueToken(token);
  const session = await authRepository.findAuthSessionByToken(tokenHash);

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      authRepository.revokeAuthSession(session.id).catch(() => {});
      c.header("Set-Cookie", clearSessionCookieValue(c));
    }
    return c.json({ success: false, error: { code: AUTH_ERRORS.SESSION_EXPIRED.code, message: AUTH_ERRORS.SESSION_EXPIRED.message } }, 401);
  }

  if (session.sessionVersion !== session.user.sessionVersion) {
    authRepository.revokeAuthSession(session.id).catch(() => {});
    c.header("Set-Cookie", clearSessionCookieValue(c));
    return c.json({ success: false, error: { code: AUTH_ERRORS.SESSION_REVOKED.code, message: AUTH_ERRORS.SESSION_REVOKED.message } }, 401);
  }

  const user: AuthUser = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    avatarUrl: session.user.avatarUrl,
    roles: session.user.roleAssignments?.map((r) => r.role) ?? [],
    sessionVersion: session.user.sessionVersion,
    createdAt: session.user.createdAt.toISOString(),
  };

  c.set("user", user);
  await next();
}
