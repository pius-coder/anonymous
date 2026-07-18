import type { Context, Next } from "hono";
import { auditRepository } from "@session-jeu/db";
import { getClientIp } from "../auth/session.js";

export function auditLog(action: string, entity: string) {
  return async (c: Context, next: Next): Promise<void> => {
    await next();
    const user = c.get("user") as { id: string } | undefined;
    await auditRepository.createAuditLog({
      userId: user?.id,
      action,
      entity,
      ipAddress: getClientIp(c),
    }).catch(() => {});
  };
}
