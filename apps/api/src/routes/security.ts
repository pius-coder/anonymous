import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAuth, requireRole, type AuthVariables } from "../auth/session.js";
import { errorResponse, successResponse } from "../lib/responses.js";
import { rateLimit } from "../middleware/rateLimit.js";
import {
  createSupportDispute,
  getSessionRisk,
  securityAuditContext,
  sessionRiskParamsSchema,
  supportDisputeSchema,
} from "../security/security.js";

const security = new Hono<{ Variables: AuthVariables }>();

const validationHook = (result: { success: boolean }, c: Parameters<typeof errorResponse>[0]) => {
  if (!result.success) {
    return errorResponse(c, 400, "VALIDATION_ERROR", "Validation failed");
  }
};

security.get(
  "/security/session/:id/risk",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN", "SUPPORT"),
  zValidator("param", sessionRiskParamsSchema, validationHook),
  async (c) => {
    const { id } = c.req.valid("param");
    const risk = await getSessionRisk(id);
    return successResponse(c, { risk });
  },
);

security.post(
  "/support/disputes",
  rateLimit({ scope: "support-disputes", limit: 10, windowMs: 60_000 }),
  requireAuth,
  zValidator("json", supportDisputeSchema, validationHook),
  async (c) => {
    const user = c.get("user");
    const data = c.req.valid("json");
    const dispute = await createSupportDispute({
      userId: user.id,
      data,
      context: securityAuditContext(c),
    });
    return successResponse(c, { dispute }, 201);
  },
);

export default security;
