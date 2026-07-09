import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAuth } from "../auth/session.js";
import type { AuthVariables } from "../auth/session.js";
import { errorResponse, successResponse } from "../lib/responses.js";
import {
  adminLiveSessionParamsSchema,
  createLiveReservation,
  getGameWsEndpoint,
  getLiveStateForPlayer,
  liveReservationBodySchema,
  liveSessionParamsSchema,
  serializeLiveSessionState,
} from "../live/live.js";
import { resolvePublicSessionId } from "../sessions/resolveSession.js";

const live = new Hono<{ Variables: AuthVariables }>();

const validationHook = (result: { success: boolean }, c: Parameters<typeof errorResponse>[0]) => {
  if (!result.success) {
    return errorResponse(c, 400, "VALIDATION_ERROR", "Validation failed");
  }
};

live.post(
  "/sessions/:id/reservation",
  requireAuth,
  zValidator("param", liveSessionParamsSchema, validationHook),
  zValidator("json", liveReservationBodySchema, validationHook),
  async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const sessionId = await resolvePublicSessionId(id);
    const result = await createLiveReservation({
      userId: user.id,
      sessionId,
      joinToken: body.joinToken,
    });

    if (result.type === "invalid-join-token") {
      return errorResponse(c, 403, "JOIN_TOKEN_INVALID", "Join token is invalid");
    }
    if (result.type === "expired-join-token") {
      return errorResponse(c, 410, "JOIN_TOKEN_EXPIRED", "Join token has expired");
    }
    if (result.type === "used-join-token") {
      return errorResponse(c, 409, "JOIN_TOKEN_USED", "Join token has already been used");
    }
    if (result.type === "not-checked-in") {
      return errorResponse(c, 403, "NOT_CHECKED_IN", "Check-in is required before live entry");
    }
    if (result.type === "session-cancelled") {
      return errorResponse(c, 410, "SESSION_CANCELLED", "Session is cancelled");
    }
    if (result.type === "session-not-live") {
      return errorResponse(c, 409, "SESSION_NOT_LIVE", "Session is not live");
    }

    return successResponse(c, {
      reservation: {
        token: result.liveToken,
        tokenId: result.reservation.id,
        expiresAt: result.reservation.expiresAt.toISOString(),
      },
      websocket: {
          endpoint: getGameWsEndpoint(),
          roomName: "game_session",
          options: {
          sessionId,
          reservationToken: result.liveToken,
        },
      },
      liveState: serializeLiveSessionState(result.liveState),
    });
  },
);

live.get(
  "/:sessionId/state",
  requireAuth,
  zValidator("param", adminLiveSessionParamsSchema, validationHook),
  async (c) => {
    const user = c.get("user");
    const { sessionId: identifier } = c.req.valid("param");
    const sessionId = await resolvePublicSessionId(identifier);
    const result = await getLiveStateForPlayer({ userId: user.id, sessionId });

    if (result.type === "not-checked-in") {
      return errorResponse(c, 403, "NOT_CHECKED_IN", "Live state requires check-in");
    }
    if (result.type === "not-live") {
      return errorResponse(c, 409, "SESSION_NOT_LIVE", "Live state is not available");
    }

    return successResponse(c, {
      liveState: serializeLiveSessionState(result.liveState),
      currentRound: result.liveState.currentRound
        ? {
            id: result.liveState.currentRound.id,
            roundNum: result.liveState.currentRound.roundNum,
            status: result.liveState.currentRound.status,
            startTime: result.liveState.currentRound.startTime?.toISOString() ?? null,
            endTime: result.liveState.currentRound.endTime?.toISOString() ?? null,
          }
        : null,
      deadline: result.deadline
        ? {
            deadlineAt: result.deadline.deadlineAt.toISOString(),
            closedAt: result.deadline.closedAt?.toISOString() ?? null,
          }
        : null,
      players: result.players.map((player) => ({
        userId: player.userId,
        status: player.status,
        lastSeenAt: player.lastSeenAt?.toISOString() ?? null,
        disconnectedAt: player.disconnectedAt?.toISOString() ?? null,
        reconnectUntil: player.reconnectUntil?.toISOString() ?? null,
      })),
    });
  },
);

export default live;
