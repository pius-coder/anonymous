import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  requireAuth,
  requireRole,
  type AuthVariables,
} from "../../auth/session.js";
import {
  adminActionParamsSchema,
  adminAuditLogsQuerySchema,
  adminUserParamsSchema,
  approveAdminAction,
  approveAdminActionSchema,
  auditContext,
  createAdminActionRequest,
  createAdminActionSchema,
  createIncident,
  createIncidentSchema,
  createSupportCase,
  createSupportCaseSchema,
  getAdminDashboard,
  getSupportUserView,
  listAuditLogs,
} from "../../admin/operations.js";
import { errorResponse, successResponse } from "../../lib/responses.js";

const adminOperations = new Hono<{ Variables: AuthVariables }>();

const validationHook = (result: { success: boolean }, c: Parameters<typeof errorResponse>[0]) => {
  if (!result.success) {
    return errorResponse(c, 400, "VALIDATION_ERROR", "Validation failed");
  }
};

adminOperations.get(
  "/dashboard",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN", "SUPPORT", "FINANCE"),
  async (c) => {
    const user = c.get("user");
    const dashboard = await getAdminDashboard(user.role);
    return successResponse(c, { dashboard });
  },
);

adminOperations.get(
  "/audit-logs",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN", "SUPPORT", "FINANCE"),
  zValidator("query", adminAuditLogsQuerySchema, validationHook),
  async (c) => {
    const user = c.get("user");
    const query = c.req.valid("query");
    const auditLogs = await listAuditLogs({
      role: user.role,
      actorId: query.actorId,
      action: query.action,
      entity: query.entity,
      entityId: query.entityId,
      requestId: query.requestId,
      cursor: query.cursor,
      limit: query.limit,
    });
    return successResponse(c, auditLogs);
  },
);

adminOperations.get(
  "/support/users/:id",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN", "SUPPORT", "FINANCE"),
  zValidator("param", adminUserParamsSchema, validationHook),
  async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const result = await getSupportUserView({ userId: id, role: user.role });

    if (result.type === "not-found") {
      return errorResponse(c, 404, "USER_NOT_FOUND", "User was not found");
    }

    return successResponse(c, { user: result.user });
  },
);

adminOperations.post(
  "/support/users/:id/cases",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN", "SUPPORT"),
  zValidator("param", adminUserParamsSchema, validationHook),
  zValidator("json", createSupportCaseSchema, validationHook),
  async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const result = await createSupportCase({
      targetUserId: id,
      adminUserId: user.id,
      data: body,
      context: auditContext(c),
    });

    if (result.type === "not-found") {
      return errorResponse(c, 404, "USER_NOT_FOUND", "User was not found");
    }

    return successResponse(c, { supportCase: result.supportCase }, 201);
  },
);

adminOperations.post(
  "/incidents",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN", "SUPPORT"),
  zValidator("json", createIncidentSchema, validationHook),
  async (c) => {
    const user = c.get("user");
    const body = c.req.valid("json");
    const incident = await createIncident({
      adminUserId: user.id,
      data: body,
      context: auditContext(c),
    });

    return successResponse(c, { incident }, 201);
  },
);

adminOperations.post(
  "/actions",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  zValidator("json", createAdminActionSchema, validationHook),
  async (c) => {
    const user = c.get("user");
    const body = c.req.valid("json");
    const action = await createAdminActionRequest({
      adminUserId: user.id,
      data: body,
      context: auditContext(c),
    });

    return successResponse(c, { action }, 201);
  },
);

adminOperations.post(
  "/actions/:id/approve",
  requireAuth,
  requireRole("SUPER_ADMIN"),
  zValidator("param", adminActionParamsSchema, validationHook),
  zValidator("json", approveAdminActionSchema, validationHook),
  async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const result = await approveAdminAction({
      actionId: id,
      approverUserId: user.id,
      reason: body.reason,
      context: auditContext(c),
    });

    if (result.type === "not-found") {
      return errorResponse(c, 404, "ACTION_NOT_FOUND", "Action request was not found");
    }
    if (result.type === "not-approvable") {
      return errorResponse(c, 409, "409_ACTION_NOT_APPROVABLE", "Action cannot be approved");
    }

    return successResponse(c, { action: result.action });
  },
);

export default adminOperations;
