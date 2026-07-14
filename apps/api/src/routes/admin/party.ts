import { Hono } from "hono";
import type { AppEnv } from "../../app-env.js";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { auditLog } from "../../middleware/audit.js";
import { successResponse, errorResponse } from "../../lib/responses.js";
import {
  createPartyDraft,
  getAdminParty,
  updatePartyConfig,
  validatePartyConfig,
  publishParty,
  scheduleParty,
  PartyUseCaseError,
} from "../../use-cases/party/party.use-case.js";
import { listPartyParticipations, ParticipationUseCaseError } from "../../use-cases/party/participation.use-case.js";
import type { StatusCode } from "hono/utils/http-status";

const adminPartyRouter = new Hono<AppEnv>();

const createPartySchema = z.object({
  code: z.string().min(3).max(20),
  name: z.string().min(1).max(100),
  visibility: z.enum(["public", "private"]).optional().default("public"),
  minPlayers: z.number().int().min(2).optional(),
  maxPlayers: z.number().int().min(2).optional(),
  roundProgram: z.unknown().optional(),
});

const partyIdParamSchema = z.object({
  id: z.string().min(1),
});

const updateConfigSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  visibility: z.enum(["public", "private"]).optional(),
  minPlayers: z.number().int().min(2).optional(),
  maxPlayers: z.number().int().min(2).optional(),
  roundProgram: z.unknown().optional(),
});

const schedulePartySchema = z.object({
  scheduledAt: z.string().min(1),
});

function handleError(c: Parameters<typeof errorResponse>[0], err: unknown) {
  if (err instanceof PartyUseCaseError) {
    return errorResponse(c, err.httpStatus as StatusCode, err.code, err.message);
  }
  if (err instanceof ParticipationUseCaseError) {
    return errorResponse(c, err.httpStatus as StatusCode, err.code, err.message);
  }
  console.error("Unexpected admin party error:", err);
  return errorResponse(c, 500 as StatusCode, "INTERNAL", "Erreur interne du serveur");
}

adminPartyRouter.post("/parties", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), zValidator("json", createPartySchema), auditLog("PARTY_CREATE", "Party"), async (c) => {
  try {
    const input = c.req.valid("json");
    const result = await createPartyDraft(input);
    return successResponse(c, result, 201);
  } catch (err) {
    return handleError(c, err);
  }
});

adminPartyRouter.get("/parties/:id", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), zValidator("param", partyIdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid("param");
    const result = await getAdminParty({ id });
    return successResponse(c, result);
  } catch (err) {
    return handleError(c, err);
  }
});

adminPartyRouter.put("/parties/:id/config", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), zValidator("param", partyIdParamSchema), zValidator("json", updateConfigSchema), auditLog("PARTY_CONFIG_UPDATE", "Party"), async (c) => {
  try {
    const { id } = c.req.valid("param");
    const input = c.req.valid("json");
    const result = await updatePartyConfig({ id, ...input });
    return successResponse(c, result);
  } catch (err) {
    return handleError(c, err);
  }
});

adminPartyRouter.post("/parties/:id/validate", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), zValidator("param", partyIdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid("param");
    const result = await validatePartyConfig({ id });
    return successResponse(c, result);
  } catch (err) {
    return handleError(c, err);
  }
});

adminPartyRouter.post("/parties/:id/publish", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), zValidator("param", partyIdParamSchema), auditLog("PARTY_PUBLISH", "Party"), async (c) => {
  try {
    const { id } = c.req.valid("param");
    const result = await publishParty({ id });
    return successResponse(c, result);
  } catch (err) {
    return handleError(c, err);
  }
});

adminPartyRouter.post("/parties/:id/schedule", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), zValidator("param", partyIdParamSchema), zValidator("json", schedulePartySchema), auditLog("PARTY_SCHEDULE", "Party"), async (c) => {
  try {
    const { id } = c.req.valid("param");
    const { scheduledAt } = c.req.valid("json");
    const result = await scheduleParty({ id, scheduledAt });
    return successResponse(c, result);
  } catch (err) {
    return handleError(c, err);
  }
});

adminPartyRouter.get("/parties/:id/participations", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), zValidator("param", partyIdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid("param");
    const result = await listPartyParticipations({ partyId: id });
    return successResponse(c, result);
  } catch (err) {
    return handleError(c, err);
  }
});

export { adminPartyRouter };
