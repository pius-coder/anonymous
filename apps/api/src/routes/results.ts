import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAuth } from "../auth/session.js";
import type { AuthVariables } from "../auth/session.js";
import { errorResponse, successResponse } from "../lib/responses.js";
import { getSessionResultsForPlayer, sessionResultsParamsSchema } from "../results/results.js";
import { resolvePublicSessionId } from "../sessions/resolveSession.js";

const results = new Hono<{ Variables: AuthVariables }>();

const validationHook = (result: { success: boolean }, c: Parameters<typeof errorResponse>[0]) => {
  if (!result.success) {
    return errorResponse(c, 400, "VALIDATION_ERROR", "Validation failed");
  }
};

results.get(
  "/sessions/:id/results",
  requireAuth,
  zValidator("param", sessionResultsParamsSchema, validationHook),
  async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const sessionId = await resolvePublicSessionId(id);
    const result = await getSessionResultsForPlayer({ sessionId, userId: user.id });

    if (result.type === "not-found") {
      return errorResponse(c, 404, "SESSION_NOT_FOUND", "Session not found");
    }
    if (result.type === "forbidden") {
      return errorResponse(c, 403, "RESULTS_FORBIDDEN", "Results are limited to participants");
    }
    if (result.type === "not-finalized") {
      return errorResponse(c, 409, "RESULTS_NOT_FINALIZED", "Results are not finalized");
    }

    return successResponse(c, {
      session: result.session,
      results: result.results,
      distributions: result.distributions,
      disputeWindow: result.disputeWindow,
    });
  },
);

export default results;
