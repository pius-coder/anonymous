import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "@session-jeu/db";
import { requireAuth, requireRole, type AuthVariables } from "../../auth/session.js";
import { errorResponse, successResponse } from "../../lib/responses.js";
import {
  createModerationAction,
  listComplianceGates,
  moderationActionSchema,
  securityAuditContext,
  setComplianceGateStatus,
} from "../../security/security.js";
import z from "zod";

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

const complianceGateDecisionSchema = z.object({
  status: z.enum(["PASSED", "WAIVED", "BLOCKED"]),
  evidence: z.record(z.string(), z.unknown()).optional(),
  reason: z.string().trim().min(3).max(500).optional(),
});

adminSecurity.patch(
  "/compliance/gates/:id",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  zValidator("param", z.object({ id: z.string().min(1) }), validationHook),
  zValidator("json", complianceGateDecisionSchema, validationHook),
  async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    const gate = await setComplianceGateStatus({
      gateId: id,
      status: data.status,
      decidedById: user.id,
      evidence: data.evidence,
      reason: data.reason,
    });
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "compliance.gate-decided",
        entity: "ComplianceGate",
        entityId: id,
        reason: data.reason ?? `status=${data.status}`,
        newData: { status: data.status, type: gate.type, scope: gate.scope },
      },
    });
    return successResponse(c, { gate });
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
