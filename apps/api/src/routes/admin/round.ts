import { Hono } from "hono";
import type { AppEnv } from "../../app-env.js";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { auditLog } from "../../middleware/audit.js";
import { successResponse, errorResponse } from "../../lib/responses.js";
import { roundRepository } from "@session-jeu/db";
import {
  activateRound,
  closeRound,
  configureRound,
  pauseRound,
  resumeRound,
  RoundUseCaseError,
  startRoundBriefing,
} from "../../use-cases/round/round.use-case.js";
import { assertLease, AdminLeaseError } from "../../lib/admin-control-lease.js";
import type { StatusCode } from "hono/utils/http-status";

const adminRoundRouter = new Hono<AppEnv>();

const partyIdParamSchema = z.object({
  id: z.string().min(1),
});

const roundIdParamSchema = z.object({
  roundId: z.string().min(1),
});

const configureRoundSchema = z.object({
  roundNumber: z.number().int().min(1),
  minigameId: z.string().min(1).max(120),
  durationSeconds: z.number().int().min(1).max(24 * 60 * 60).optional(),
  auditReason: z.string().trim().min(1).max(500).optional(),
});

const reasonSchema = z.object({
  reason: z.string().trim().min(1).max(500).optional(),
  auditReason: z.string().trim().min(1).max(500).optional(),
});

function getAuditReason(input: z.infer<typeof reasonSchema>) {
  return input.reason ?? input.auditReason;
}

function handleError(c: Parameters<typeof errorResponse>[0], err: unknown) {
  if (err instanceof RoundUseCaseError) {
    return errorResponse(c, err.httpStatus as StatusCode, err.code, err.message);
  }
  if (err instanceof AdminLeaseError) {
    return errorResponse(c, err.httpStatus as StatusCode, err.code, err.message);
  }
  console.error("Unexpected admin round error:", err);
  return errorResponse(c, 500 as StatusCode, "INTERNAL", "Erreur interne du serveur");
}

async function assertRoundLease(roundId: string, userId: string): Promise<void> {
  const round = await roundRepository.findRoundById(roundId);
  if (!round) {
    throw new RoundUseCaseError("ROUND_NOT_FOUND", "Manche introuvable", 404);
  }
  await assertLease(round.partyId, userId);
}

adminRoundRouter.post(
  "/parties/:id/rounds/configure",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  zValidator("param", partyIdParamSchema),
  zValidator("json", configureRoundSchema),
  auditLog("ROUND_CONFIGURE", "Round"),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const input = c.req.valid("json");
      const user = c.get("user");
      const result = await configureRound({ partyId: id, configuredBy: user.id, ...input });
      return successResponse(c, result, 201);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

adminRoundRouter.post(
  "/rounds/:roundId/briefing",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  zValidator("param", roundIdParamSchema),
  auditLog("ROUND_BRIEFING_START", "Round"),
  async (c) => {
    try {
      const { roundId } = c.req.valid("param");
      const user = c.get("user");
      const result = await startRoundBriefing({ roundId, actorId: user.id });
      return successResponse(c, result);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

adminRoundRouter.post(
  "/rounds/:roundId/start",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  zValidator("param", roundIdParamSchema),
  auditLog("ROUND_ACTIVATE", "Round"),
  async (c) => {
    try {
      const { roundId } = c.req.valid("param");
      const user = c.get("user");
      await assertRoundLease(roundId, user.id);
      const result = await activateRound({ roundId, actorId: user.id });
      return successResponse(c, result);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

adminRoundRouter.post(
  "/rounds/:roundId/pause",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  zValidator("param", roundIdParamSchema),
  zValidator("json", reasonSchema),
  auditLog("ROUND_PAUSE", "Round"),
  async (c) => {
    try {
      const { roundId } = c.req.valid("param");
      const reason = getAuditReason(c.req.valid("json"));
      const user = c.get("user");
      await assertRoundLease(roundId, user.id);
      const result = await pauseRound({ roundId, actorId: user.id, reason });
      return successResponse(c, result);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

adminRoundRouter.post(
  "/rounds/:roundId/resume",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  zValidator("param", roundIdParamSchema),
  zValidator("json", reasonSchema),
  auditLog("ROUND_RESUME", "Round"),
  async (c) => {
    try {
      const { roundId } = c.req.valid("param");
      const reason = getAuditReason(c.req.valid("json"));
      const user = c.get("user");
      await assertRoundLease(roundId, user.id);
      const result = await resumeRound({ roundId, actorId: user.id, reason });
      return successResponse(c, result);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

adminRoundRouter.post(
  "/rounds/:roundId/close",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  zValidator("param", roundIdParamSchema),
  zValidator("json", reasonSchema),
  auditLog("ROUND_CLOSE", "Round"),
  async (c) => {
    try {
      const { roundId } = c.req.valid("param");
      const reason = getAuditReason(c.req.valid("json"));
      const user = c.get("user");
      await assertRoundLease(roundId, user.id);
      const result = await closeRound({ roundId, actorId: user.id, reason });
      return successResponse(c, result);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

export { adminRoundRouter };
