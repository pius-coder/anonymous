import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  requireAuth,
  requireRole,
  type AuthVariables,
} from "../../auth/session.js";
import { errorResponse, successResponse } from "../../lib/responses.js";
import { scheduleCreditsDistribution } from "../../queues/creditsDistribution.js";
import {
  correctionRequestSchema,
  finalizeSessionResults,
  finalizeSessionSchema,
  getSessionResultsForAdmin,
  requestResultsCorrection,
  sessionResultsParamsSchema,
} from "../../results/results.js";

const adminResults = new Hono<{ Variables: AuthVariables }>();

const validationHook = (result: { success: boolean }, c: Parameters<typeof errorResponse>[0]) => {
  if (!result.success) {
    return errorResponse(c, 400, "VALIDATION_ERROR", "Validation failed");
  }
};

adminResults.get(
  "/sessions/:id/results",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN", "SUPPORT", "FINANCE"),
  zValidator("param", sessionResultsParamsSchema, validationHook),
  async (c) => {
    const { id } = c.req.valid("param");
    const result = await getSessionResultsForAdmin(id);

    if (result.type === "not-found") {
      return errorResponse(c, 404, "SESSION_NOT_FOUND", "Session not found");
    }

    return successResponse(c, {
      session: result.session,
      results: result.results,
      distributions: result.distributions,
      commission: result.commission,
      disputeWindow: result.disputeWindow,
    });
  },
);

adminResults.post(
  "/sessions/:id/finalize",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  zValidator("param", sessionResultsParamsSchema, validationHook),
  zValidator("json", finalizeSessionSchema, validationHook),
  async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const result = await finalizeSessionResults({
      sessionId: id,
      adminUserId: user.id,
      tiePolicy: body.tiePolicy,
      remainderPolicy: body.remainderPolicy,
      reason: body.reason,
    });

    if (result.type === "not-found") {
      return errorResponse(c, 404, "SESSION_NOT_FOUND", "Session not found");
    }
    if (result.type === "not-ready") {
      return errorResponse(c, 409, "SESSION_NOT_READY_TO_FINALIZE", "Session is not ready", {
        reason: result.reason,
      });
    }
    if (result.type === "tie-policy-required") {
      return errorResponse(c, 422, "TIE_POLICY_REQUIRED", "Tie policy is required");
    }
    if (result.type === "already-finalized") {
      return successResponse(c, {
        status: "already-finalized",
        commissionId: result.commission.id,
      });
    }

    await scheduleCreditsDistribution({ sessionId: id });
    return successResponse(
      c,
      {
        status: "finalized",
        sessionId: result.sessionId,
        commissionId: result.commission.id,
        winnerCount: result.winnerCount,
      },
      201,
    );
  },
);

adminResults.post(
  "/sessions/:id/correction-request",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN", "SUPPORT"),
  zValidator("param", sessionResultsParamsSchema, validationHook),
  zValidator("json", correctionRequestSchema, validationHook),
  async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const result = await requestResultsCorrection({
      sessionId: id,
      adminUserId: user.id,
      reason: body.reason,
    });

    if (result.type === "not-found") {
      return errorResponse(c, 404, "SESSION_NOT_FOUND", "Session not found");
    }
    if (result.type === "not-finalized") {
      return errorResponse(c, 409, "RESULTS_NOT_FINALIZED", "Results are not finalized");
    }

    return successResponse(c, {
      disputeWindow: {
        id: result.disputeWindow.id,
        status: result.disputeWindow.status,
        reason: result.disputeWindow.requestReason,
        requestedById: result.disputeWindow.requestedById,
        requestedAt: result.disputeWindow.requestedAt?.toISOString() ?? null,
      },
    });
  },
);

export default adminResults;
