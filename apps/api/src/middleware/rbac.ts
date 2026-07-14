import type { Context, Next } from "hono";
import { AUTH_ERRORS } from "@session-jeu/shared";
import type { AuthUser } from "./auth.js";

export function requireRole(...roles: string[]) {
  return async (c: Context, next: Next): Promise<Response | void> => {
    const user = c.get("user") as AuthUser | undefined;
    if (!user) {
      return c.json({ success: false, error: { code: AUTH_ERRORS.UNAUTHORIZED.code, message: AUTH_ERRORS.UNAUTHORIZED.message } }, 401);
    }

    const hasRole = user.roles.some((r) => roles.includes(r));
    if (!hasRole) {
      return c.json({ success: false, error: { code: AUTH_ERRORS.FORBIDDEN.code, message: AUTH_ERRORS.FORBIDDEN.message } }, 403);
    }

    await next();
  };
}
