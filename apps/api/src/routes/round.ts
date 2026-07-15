import { Hono } from "hono";
import type { AppEnv } from "../app-env.js";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { successResponse, errorResponse } from "../lib/responses.js";
import { finishPlayerRound, RoundUseCaseError } from "../use-cases/round/round.use-case.js";
import type { StatusCode } from "hono/utils/http-status";

const roundRouter = new Hono<AppEnv>();

const roundIdParamSchema = z.object({
  roundId: z.string().min(1),
});

const playerActionPayloadSchema = z.record(
  z.string().min(1).max(64),
  z.union([z.string().max(500), z.number(), z.boolean(), z.null()]),
).refine((payload) => JSON.stringify(payload).length <= 4096, {
  error: "Payload trop volumineux",
});

const finishRoundSchema = z.object({
  actionNonce: z.string().min(1).max(160),
  payload: playerActionPayloadSchema.optional(),
});

function handleError(c: Parameters<typeof errorResponse>[0], err: unknown) {
  if (err instanceof RoundUseCaseError) {
    return errorResponse(c, err.httpStatus as StatusCode, err.code, err.message);
  }
  console.error("Unexpected round error:", err);
  return errorResponse(c, 500 as StatusCode, "INTERNAL", "Erreur interne du serveur");
}

roundRouter.post(
  "/rounds/:roundId/finish",
  requireAuth,
  zValidator("param", roundIdParamSchema),
  zValidator("json", finishRoundSchema),
  async (c) => {
    try {
      const { roundId } = c.req.valid("param");
      const { actionNonce, payload } = c.req.valid("json");
      const user = c.get("user");
      const result = await finishPlayerRound({ roundId, userId: user.id, actionNonce, payload });
      return successResponse(c, result);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

export { roundRouter };
