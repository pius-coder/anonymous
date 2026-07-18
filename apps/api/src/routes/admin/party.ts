import { Hono } from "hono";
import type { AppEnv } from "../../app-env.js";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { auditLog } from "../../middleware/audit.js";
import { successResponse, errorResponse } from "../../lib/responses.js";
import {
  acquireLease,
  AdminLeaseError,
  assertLease,
  getLeaseStatus,
  releaseLease,
} from "../../lib/admin-control-lease.js";
import {
  cancelParty,
  completeParty,
  createPartyDraft,
  getAdminParty,
  listAdminParties,
  listPartyAuditTimeline,
  publishParty,
  scheduleParty,
  updatePartyConfig,
  validatePartyConfig,
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
  description: z.string().max(2000).optional(),
  entryFeeAmount: z.number().min(0).nullable().optional(),
  entryFeeCurrency: z.string().min(3).max(8).optional(),
  scheduledAt: z.string().optional(),
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
  description: z.string().max(2000).nullable().optional(),
  entryFeeAmount: z.number().min(0).nullable().optional(),
  entryFeeCurrency: z.string().min(3).max(8).optional(),
  expectedUpdatedAt: z.string().optional(),
  expectedConfigVersion: z.number().int().min(1).optional(),
});

const schedulePartySchema = z.object({
  scheduledAt: z.string().min(1),
  expectedUpdatedAt: z.string().optional(),
  expectedConfigVersion: z.number().int().min(1).optional(),
});

const reasonSchema = z.object({
  reason: z.string().trim().min(1).max(500),
  expectedUpdatedAt: z.string().optional(),
  expectedConfigVersion: z.number().int().min(1).optional(),
});

const listQuerySchema = z.object({
  status: z.string().optional(),
  skip: z.coerce.number().int().min(0).optional(),
  take: z.coerce.number().int().min(1).max(100).optional(),
});

const leaseBodySchema = z.object({
  ttlSeconds: z.number().int().min(30).max(600).optional(),
});

function handleError(c: Parameters<typeof errorResponse>[0], err: unknown) {
  if (err instanceof PartyUseCaseError) {
    return errorResponse(c, err.httpStatus as StatusCode, err.code, err.message);
  }
  if (err instanceof ParticipationUseCaseError) {
    return errorResponse(c, err.httpStatus as StatusCode, err.code, err.message);
  }
  if (err instanceof AdminLeaseError) {
    return errorResponse(c, err.httpStatus as StatusCode, err.code, err.message);
  }
  console.error("Unexpected admin party error:", err);
  return errorResponse(c, 500 as StatusCode, "INTERNAL", "Erreur interne du serveur");
}

adminPartyRouter.get(
  "/parties",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  zValidator("query", listQuerySchema),
  async (c) => {
    try {
      const q = c.req.valid("query");
      const result = await listAdminParties({
        status: q.status,
        skip: q.skip,
        take: q.take,
      });
      return successResponse(c, result);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

adminPartyRouter.post(
  "/parties",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  zValidator("json", createPartySchema),
  auditLog("PARTY_CREATE", "Party"),
  async (c) => {
    try {
      const input = c.req.valid("json");
      const result = await createPartyDraft(input);
      return successResponse(c, result, 201);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

adminPartyRouter.get(
  "/parties/:id",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  zValidator("param", partyIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const result = await getAdminParty({ id });
      return successResponse(c, result);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

adminPartyRouter.put(
  "/parties/:id/config",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  zValidator("param", partyIdParamSchema),
  zValidator("json", updateConfigSchema),
  auditLog("PARTY_CONFIG_UPDATE", "Party"),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const input = c.req.valid("json");
      const result = await updatePartyConfig({ id, ...input });
      return successResponse(c, result);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

adminPartyRouter.post(
  "/parties/:id/validate",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  zValidator("param", partyIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const result = await validatePartyConfig({ id });
      return successResponse(c, result);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

const publishBodySchema = z
  .object({
    reason: z.string().trim().max(500).optional(),
    expectedUpdatedAt: z.string().optional(),
    expectedConfigVersion: z.number().int().min(1).optional(),
  })
  .optional()
  .default({});

adminPartyRouter.post(
  "/parties/:id/publish",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  zValidator("param", partyIdParamSchema),
  zValidator("json", publishBodySchema),
  auditLog("PARTY_PUBLISH", "Party"),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const body = c.req.valid("json") ?? {};
      const user = c.get("user");
      await assertLease(id, user.id);
      const result = await publishParty({
        id,
        actorId: user.id,
        reason: body.reason,
        expectedUpdatedAt: body.expectedUpdatedAt,
        expectedConfigVersion: body.expectedConfigVersion,
      });
      return successResponse(c, result);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

adminPartyRouter.post(
  "/parties/:id/schedule",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  zValidator("param", partyIdParamSchema),
  zValidator("json", schedulePartySchema),
  auditLog("PARTY_SCHEDULE", "Party"),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const user = c.get("user");
      const result = await scheduleParty({
        id,
        scheduledAt: body.scheduledAt,
        expectedUpdatedAt: body.expectedUpdatedAt,
        expectedConfigVersion: body.expectedConfigVersion,
        actorId: user.id,
      });
      return successResponse(c, result);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

adminPartyRouter.post(
  "/parties/:id/cancel",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  zValidator("param", partyIdParamSchema),
  zValidator("json", reasonSchema),
  auditLog("PARTY_CANCEL", "Party"),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const user = c.get("user");
      await assertLease(id, user.id);
      const result = await cancelParty({
        id,
        actorId: user.id,
        reason: body.reason,
        expectedUpdatedAt: body.expectedUpdatedAt,
        expectedConfigVersion: body.expectedConfigVersion,
      });
      return successResponse(c, result);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

adminPartyRouter.post(
  "/parties/:id/complete",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  zValidator("param", partyIdParamSchema),
  zValidator("json", reasonSchema),
  auditLog("PARTY_COMPLETE", "Party"),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const user = c.get("user");
      await assertLease(id, user.id);
      const result = await completeParty({
        id,
        actorId: user.id,
        reason: body.reason,
        expectedUpdatedAt: body.expectedUpdatedAt,
        expectedConfigVersion: body.expectedConfigVersion,
      });
      return successResponse(c, result);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

adminPartyRouter.get(
  "/parties/:id/participations",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  zValidator("param", partyIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const result = await listPartyParticipations({ partyId: id });
      return successResponse(c, result);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

adminPartyRouter.get(
  "/parties/:id/audit",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  zValidator("param", partyIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const events = await listPartyAuditTimeline({ partyId: id });
      return successResponse(c, { events });
    } catch (err) {
      return handleError(c, err);
    }
  },
);

adminPartyRouter.get(
  "/parties/:id/control-lease",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  zValidator("param", partyIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const user = c.get("user");
      const status = await getLeaseStatus(id, user.id);
      return successResponse(c, status);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

adminPartyRouter.post(
  "/parties/:id/control-lease",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  zValidator("param", partyIdParamSchema),
  zValidator("json", leaseBodySchema),
  auditLog("CONTROL_LEASE_ACQUIRE", "Party"),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const { ttlSeconds } = c.req.valid("json");
      const user = c.get("user");
      const status = await acquireLease(id, user.id, ttlSeconds);
      return successResponse(c, status);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

adminPartyRouter.delete(
  "/parties/:id/control-lease",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  zValidator("param", partyIdParamSchema),
  auditLog("CONTROL_LEASE_RELEASE", "Party"),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const user = c.get("user");
      const status = await releaseLease(id, user.id);
      return successResponse(c, status);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

export { adminPartyRouter };
