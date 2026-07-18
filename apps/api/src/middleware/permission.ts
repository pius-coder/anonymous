import type { Context, Next } from "hono";
import type { AuthUser } from "./auth.js";
import { hasAnyPermission } from "@session-jeu/game-engine";
import type { Permission } from "@session-jeu/game-engine";

export function requirePermission(...permissions: Permission[]) {
  return async (c: Context, next: Next): Promise<Response | void> => {
    const user = c.get("user") as AuthUser | undefined;
    if (!user) {
      return c.json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentification requise" },
      }, 401);
    }

    const systemRoles = user.roles as Parameters<typeof hasAnyPermission>[0];
    const allowed = permissions.some((p) => hasAnyPermission(systemRoles, p));
    if (!allowed) {
      return c.json({
        success: false,
        error: { code: "FORBIDDEN", message: "Permission insuffisante" },
      }, 403);
    }

    await next();
  };
}
