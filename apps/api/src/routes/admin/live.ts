import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAuth, requireRole } from "../../auth/session.js";
import type { AuthVariables } from "../../auth/session.js";
import { errorResponse, successResponse } from "../../lib/responses.js";
import {
  adminLiveSessionParamsSchema,
  livePauseBodySchema,
  pauseLiveSession,
  resumeLiveSession,
  serializeLiveSessionState,
} from "../../live/live.js";

const adminLive = new Hono<{ Variables: AuthVariables }>();

const validationHook = (result: { success: boolean }, c: Parameters<typeof errorResponse>[0]) => {
  if (!result.success) {
    return errorResponse(c, 400, "VALIDATION_ERROR", "Validation failed");
  }
};

adminLive.post(
  "/live/:sessionId/pause",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  zValidator("param", adminLiveSessionParamsSchema, validationHook),
  zValidator("json", livePauseBodySchema, validationHook),
  async (c) => {
    const user = c.get("user");
    const { sessionId } = c.req.valid("param");
    const body = c.req.valid("json");
    const result = await pauseLiveSession({
      adminUserId: user.id,
      sessionId,
      reason: body.reason,
    });

    if (result.type === "not-found") {
      return errorResponse(c, 404, "SESSION_NOT_FOUND", "Session not found");
    }
    if (result.type === "session-not-live") {
      return errorResponse(c, 409, "SESSION_NOT_LIVE", "Session is not live");
    }

    return successResponse(c, {
      liveState: serializeLiveSessionState(result.liveState),
    });
  },
);

adminLive.post(
  "/live/:sessionId/resume",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  zValidator("param", adminLiveSessionParamsSchema, validationHook),
  async (c) => {
    const user = c.get("user");
    const { sessionId } = c.req.valid("param");
    const result = await resumeLiveSession({ adminUserId: user.id, sessionId });

    if (result.type === "not-live") {
      return errorResponse(c, 409, "SESSION_NOT_LIVE", "Live state is not available");
    }

    return successResponse(c, {
      liveState: serializeLiveSessionState(result.liveState),
    });
  },
);

export default adminLive;
