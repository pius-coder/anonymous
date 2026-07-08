import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { errorResponse, successResponse } from "../../lib/responses.js";
import { finalizeRound, replayRound } from "../../rounds/roundResolution.js";

const internalRounds = new Hono();

const roundParamsSchema = z.object({
  id: z.string().min(1),
});

const finalizeRoundBodySchema = z.object({
  family: z.enum(["solo-score", "duel-score"]).default("solo-score"),
  winnersCount: z.number().int().min(1).max(100).default(1),
  missingActionScore: z.number().int().optional(),
});

const validationHook = (result: { success: boolean }, c: Parameters<typeof errorResponse>[0]) => {
  if (!result.success) {
    return errorResponse(c, 400, "VALIDATION_ERROR", "Validation failed");
  }
};

internalRounds.use("*", async (c, next) => {
  const expected = process.env.INTERNAL_API_KEY;
  if (expected && c.req.header("x-internal-api-key") !== expected) {
    return errorResponse(c, 401, "INTERNAL_AUTH_REQUIRED", "Internal API key is required");
  }
  await next();
});

internalRounds.post(
  "/rounds/:id/finalize",
  zValidator("param", roundParamsSchema, validationHook),
  zValidator("json", finalizeRoundBodySchema, validationHook),
  async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const result = await finalizeRound({
      roundId: id,
      config: {
        family: body.family,
        winnersCount: body.winnersCount,
        missingActionScore: body.missingActionScore,
      },
    });

    if (result.type === "not-found") {
      return errorResponse(c, 404, "ROUND_NOT_FOUND", "Round not found");
    }
    if (result.type === "round-not-locked") {
      return errorResponse(c, 409, "ROUND_NOT_LOCKED", "Round is not closed", {
        status: result.status,
      });
    }
    if (result.type === "invalid-input") {
      return errorResponse(c, 400, "INVALID_ROUND_INPUT", result.reason);
    }
    if (result.type === "already-finalized") {
      return successResponse(c, {
        status: "already-finalized",
        resolutionLogId: result.resolutionLog.id,
        outputHash: result.resolutionLog.outputHash,
      });
    }

    return successResponse(c, {
      status: "finalized",
      resolutionLogId: result.resolutionLog.id,
      outputHash: result.resolutionLog.outputHash,
      output: result.output,
    });
  },
);

internalRounds.post(
  "/rounds/:id/replay",
  zValidator("param", roundParamsSchema, validationHook),
  async (c) => {
    const { id } = c.req.valid("param");
    const result = await replayRound(id);

    if (result.type === "not-finalized") {
      return errorResponse(c, 409, "RESOLUTION_NOT_FOUND", "Round has not been finalized");
    }

    return successResponse(c, {
      matched: result.matched,
      expectedOutputHash: result.expectedOutputHash,
      actualOutputHash: result.actualOutputHash,
      output: result.output,
    });
  },
);

export default internalRounds;
