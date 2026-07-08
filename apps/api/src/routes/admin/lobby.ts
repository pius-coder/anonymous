import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAuth, requireRole } from "../../auth/session.js";
import type { AuthVariables } from "../../auth/session.js";
import { errorResponse, successResponse } from "../../lib/responses.js";
import { authorizeSessionStart, sessionIdParamsSchema } from "../../lobby/lobby.js";

const adminLobby = new Hono<{ Variables: AuthVariables }>();

const validationHook = (result: { success: boolean }, c: Parameters<typeof errorResponse>[0]) => {
  if (!result.success) {
    return errorResponse(c, 400, "VALIDATION_ERROR", "Validation failed");
  }
};

adminLobby.post(
  "/sessions/:id/start",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  zValidator("param", sessionIdParamsSchema, validationHook),
  async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const result = await authorizeSessionStart({ adminUserId: user.id, sessionId: id });

    if (result.type === "not-found") {
      return errorResponse(c, 404, "SESSION_NOT_FOUND", "Session not found");
    }
    if (result.type === "session-cancelled") {
      return errorResponse(c, 410, "SESSION_CANCELLED", "Session is cancelled");
    }
    if (result.type === "not-startable") {
      return errorResponse(c, 409, "SESSION_NOT_STARTABLE", "Session cannot be started");
    }
    if (result.type === "min-not-reached") {
      return errorResponse(
        c,
        409,
        "MIN_PLAYERS_NOT_REACHED",
        "Minimum checked-in players not reached",
        {
          checkedInCount: result.checkedInCount,
          minPlayers: result.minPlayers,
        },
      );
    }

    return successResponse(c, {
      session: result.session,
      checkedInCount: result.checkedInCount,
    });
  },
);

export default adminLobby;
