import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAuth, requireRole, type AuthVariables } from "../../auth/session.js";
import { errorResponse, successResponse } from "../../lib/responses.js";
import {
  createModerationAction,
  listComplianceGates,
  moderationActionSchema,
  securityAuditContext,
} from "../../security/security.js";

const adminSecurity = new Hono<{ Variables: AuthVariables }>();

const validationHook = (result: { success: boolean }, c: Parameters<typeof errorResponse>[0]) => {
  if (!result.success) {
    return errorResponse(c, 400, "VALIDATION_ERROR", "Validation failed");
  }
};

adminSecurity.get(
  "/compliance/gates",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN", "SUPPORT", "FINANCE"),
  async (c) => {
    const gates = await listComplianceGates();
    return successResponse(c, { gates });
  },
);

adminSecurity.post(
  "/moderation/actions",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN", "SUPPORT"),
  zValidator("json", moderationActionSchema, validationHook),
  async (c) => {
    const user = c.get("user");
    const data = c.req.valid("json");
    const action = await createModerationAction({
      actorId: user.id,
      data,
      context: securityAuditContext(c),
    });
    return successResponse(c, { action }, 201);
  },
);

export default adminSecurity;
