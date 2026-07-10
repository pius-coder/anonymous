import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAuth } from "../auth/session.js";
import type { AuthVariables } from "../auth/session.js";
import { errorResponse, successResponse } from "../lib/responses.js";
import {
  checkInPlayer,
  getLobbyForPlayer,
  issueJoinToken,
  serializeJoinToken,
  serializeLobbyRegistration,
  serializeLobbySession,
  sessionIdParamsSchema,
} from "../lobby/lobby.js";
import { resolvePublicSessionId } from "../sessions/resolveSession.js";

const lobby = new Hono<{ Variables: AuthVariables }>();

const validationHook = (result: { success: boolean }, c: Parameters<typeof errorResponse>[0]) => {
  if (!result.success) {
    return errorResponse(c, 400, "VALIDATION_ERROR", "Validation failed");
  }
};

lobby.get(
  "/sessions/:id/lobby",
  requireAuth,
  zValidator("param", sessionIdParamsSchema, validationHook),
  async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const sessionId = await resolvePublicSessionId(id);
    const result = await getLobbyForPlayer({ userId: user.id, sessionId });

    if (result.type === "not-paid") {
      return errorResponse(c, 403, "NOT_PAID", "Only paid players can access the lobby");
    }
    if (result.type === "session-cancelled") {
      return errorResponse(c, 410, "SESSION_CANCELLED", "Session is cancelled");
    }

    return successResponse(c, {
      session: serializeLobbySession(result.session),
      registration: serializeLobbyRegistration(result.registration),
      players: result.players,
      presence: result.presence,
    });
  },
);

lobby.post(
  "/sessions/:id/check-in",
  requireAuth,
  zValidator("param", sessionIdParamsSchema, validationHook),
  async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const sessionId = await resolvePublicSessionId(id);
    const result = await checkInPlayer({ userId: user.id, sessionId });

    if (result.type === "not-paid") {
      return errorResponse(c, 403, "NOT_PAID", "Only paid players can check in");
    }
    if (result.type === "session-cancelled") {
      return errorResponse(c, 410, "SESSION_CANCELLED", "Session is cancelled");
    }
    if (result.type === "checkin-closed") {
      return errorResponse(c, 409, "CHECKIN_CLOSED", "Check-in deadline has passed", {
        checkInDeadlineAt: result.checkInDeadlineAt.toISOString(),
      });
    }

    return successResponse(
      c,
      {
        registration: serializeLobbyRegistration(result.registration),
        checkInDeadlineAt: result.checkInDeadlineAt?.toISOString() ?? null,
      },
      result.type === "idempotent" ? 200 : 201,
    );
  },
);

lobby.get(
  "/sessions/:id/join-token",
  requireAuth,
  zValidator("param", sessionIdParamsSchema, validationHook),
  async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const sessionId = await resolvePublicSessionId(id);
    const result = await issueJoinToken({ userId: user.id, sessionId });

    if (result.type === "not-checked-in") {
      return errorResponse(c, 403, "NOT_CHECKED_IN", "Check-in is required before joining live");
    }
    if (result.type === "session-cancelled") {
      return errorResponse(c, 410, "SESSION_CANCELLED", "Session is cancelled");
    }
    if (result.type === "session-not-live") {
      return errorResponse(c, 409, "SESSION_NOT_LIVE", "Session is not live yet");
    }

    return successResponse(c, { joinToken: serializeJoinToken(result.record, result.token) });
  },
);

export default lobby;
