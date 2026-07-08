import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAuth } from "../auth/session.js";
import type { AuthVariables } from "../auth/session.js";
import { errorResponse, successResponse } from "../lib/responses.js";
import {
  getOrCreatePlayerProfile,
  getPublicPlayerProfile,
  listPlayerHistory,
  patchPlayerProfileSchema,
  playerHistoryQuerySchema,
  playerPublicIdParamsSchema,
  recomputePlayerStats,
  serializePrivateProfile,
  serializePublicProfile,
  updatePlayerProfile,
} from "../players/playerProfile.js";

const players = new Hono<{ Variables: AuthVariables }>();

const validationHook = (result: { success: boolean }, c: Parameters<typeof errorResponse>[0]) => {
  if (!result.success) {
    return errorResponse(c, 400, "VALIDATION_ERROR", "Validation failed");
  }
};

players.get("/players/me", requireAuth, async (c) => {
  const user = c.get("user");
  const profile = await getOrCreatePlayerProfile(user.id);

  return successResponse(c, {
    profile: serializePrivateProfile(profile),
  });
});

players.patch(
  "/players/me",
  requireAuth,
  zValidator("json", patchPlayerProfileSchema, validationHook),
  async (c) => {
    const user = c.get("user");
    const input = c.req.valid("json");
    const result = await updatePlayerProfile({
      userId: user.id,
      data: input,
    });

    if (result.type === "invalid-username") {
      return errorResponse(
        c,
        400,
        "400_INVALID_NICKNAME",
        "Nickname must be 3-24 characters using letters, numbers, or underscores",
      );
    }
    if (result.type === "username-taken") {
      return errorResponse(c, 409, "409_NICKNAME_TAKEN", "Nickname is already used");
    }

    return successResponse(c, {
      profile: serializePrivateProfile({
        profile: result.profile,
        stats: result.stats,
      }),
    });
  },
);

players.get(
  "/players/me/history",
  requireAuth,
  zValidator("query", playerHistoryQuerySchema, validationHook),
  async (c) => {
    const user = c.get("user");
    const query = c.req.valid("query");
    const history = await listPlayerHistory({
      userId: user.id,
      cursor: query.cursor,
      limit: query.limit,
    });

    return successResponse(c, history);
  },
);

players.get("/players/me/stats", requireAuth, async (c) => {
  const user = c.get("user");
  const stats = await recomputePlayerStats(user.id);

  return successResponse(c, {
    stats: {
      sessionsPlayed: stats.sessionsPlayed,
      sessionsWon: stats.sessionsWon,
      winRate: stats.winRate,
      avgFinalRank: stats.avgFinalRank,
      creditsWonXaf: stats.creditsWonXaf,
      computedAt: stats.computedAt.toISOString(),
    },
  });
});

players.get(
  "/players/:publicId",
  zValidator("param", playerPublicIdParamsSchema, validationHook),
  async (c) => {
    const { publicId } = c.req.valid("param");
    const result = await getPublicPlayerProfile(publicId);

    if (result.type === "not-found" || result.type === "private") {
      return errorResponse(c, 404, "404_PLAYER_NOT_FOUND", "Player not found");
    }

    return successResponse(c, {
      profile: serializePublicProfile({
        profile: result.profile,
        stats: result.stats,
      }),
    });
  },
);

export default players;
