import { Hono } from "hono";
import type { AppEnv } from "../../app-env.js";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { auditLog } from "../../middleware/audit.js";
import { errorResponse, successResponse } from "../../lib/responses.js";
import {
  correctProvisionalScore,
  getAdminScoreVerificationDossier,
  publishResults,
  ScoringUseCaseError,
} from "../../use-cases/scoring/scoring.use-case.js";
import type { StatusCode } from "hono/utils/http-status";

const adminScoringRouter = new Hono<AppEnv>();

const partyIdParamSchema = z.object({
  partyId: z.string().min(1),
});

const roundScopedParamSchema = z.object({
  partyId: z.string().min(1),
  roundId: z.string().min(1),
});

const dossierQuerySchema = z.object({
  roundId: z.string().min(1),
});

const correctionBodySchema = z.object({
  playerId: z.string().min(1),
  correctedScore: z.number(),
  reason: z.string().trim().min(1).max(500),
  expectedVersion: z.string().datetime().optional(),
});

function handleError(c: Parameters<typeof errorResponse>[0], error: unknown) {
  if (error instanceof ScoringUseCaseError) {
    return errorResponse(c, error.httpStatus as StatusCode, error.code, error.message);
  }
  console.error("Unexpected admin scoring error:", error);
  return errorResponse(c, 500 as StatusCode, "INTERNAL", "Erreur interne du serveur");
}

adminScoringRouter.get(
  "/parties/:partyId/scores",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  zValidator("param", partyIdParamSchema),
  zValidator("query", dossierQuerySchema),
  async (c) => {
    try {
      const { partyId } = c.req.valid("param");
      const { roundId } = c.req.valid("query");
      const dossier = await getAdminScoreVerificationDossier(partyId, roundId);
      return successResponse(c, dossier);
    } catch (error) {
      return handleError(c, error);
    }
  },
);

adminScoringRouter.post(
  "/parties/:partyId/scores/:roundId/corrections",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  zValidator("param", roundScopedParamSchema),
  zValidator("json", correctionBodySchema),
  auditLog("SCORE_CORRECT", "ProvisionalScore"),
  async (c) => {
    try {
      const { roundId } = c.req.valid("param");
      const body = c.req.valid("json");
      const user = c.get("user");
      const result = await correctProvisionalScore({
        roundId,
        playerId: body.playerId,
        correctedScore: body.correctedScore,
        reason: body.reason,
        actorId: user.id,
        expectedVersion: body.expectedVersion,
      });
      return successResponse(c, result);
    } catch (error) {
      return handleError(c, error);
    }
  },
);

adminScoringRouter.post(
  "/parties/:partyId/scores/:roundId/publish",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  zValidator("param", roundScopedParamSchema),
  auditLog("RESULTS_PUBLISH", "Round"),
  async (c) => {
    try {
      const { partyId, roundId } = c.req.valid("param");
      const user = c.get("user");
      const result = await publishResults({
        roundId,
        partyId,
        actorId: user.id,
      });
      return successResponse(c, result);
    } catch (error) {
      return handleError(c, error);
    }
  },
);

export { adminScoringRouter };
