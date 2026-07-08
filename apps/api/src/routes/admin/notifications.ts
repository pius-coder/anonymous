import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAuth, requireRole, type AuthVariables } from "../../auth/session.js";
import { errorResponse, successResponse } from "../../lib/responses.js";
import {
  adminShareParamsSchema,
  createSessionShareMessage,
} from "../../notifications/notifications.js";

const adminNotifications = new Hono<{ Variables: AuthVariables }>();

const validationHook = (result: { success: boolean }, c: Parameters<typeof errorResponse>[0]) => {
  if (!result.success) {
    return errorResponse(c, 400, "VALIDATION_ERROR", "Validation failed");
  }
};

adminNotifications.post(
  "/notifications/session/:id/share",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN", "SUPPORT"),
  zValidator("param", adminShareParamsSchema, validationHook),
  async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const result = await createSessionShareMessage({ sessionId: id, adminUserId: user.id });

    if (result.type === "not-found") {
      return errorResponse(c, 404, "SESSION_NOT_FOUND", "Session not found");
    }
    if (result.type === "private") {
      return errorResponse(c, 403, "SESSION_PRIVATE", "Private sessions cannot be shared");
    }

    return successResponse(
      c,
      {
        message: result.message,
        shareUrl: result.shareUrl,
        shareLink: {
          id: result.shareLink.id,
          token: result.shareLink.token,
          sessionId: result.shareLink.sessionId,
        },
      },
      201,
    );
  },
);

export default adminNotifications;
