import { Hono } from "hono";
import type { AppEnv } from "../../app-env.js";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { auditLog } from "../../middleware/audit.js";
import { successResponse, errorResponse } from "../../lib/responses.js";
import {
  openPreparation,
  sendPreparationAnnouncement,
  confirmStart,
  getPreparationState,
  PreparationUseCaseError,
} from "../../use-cases/preparation/preparation.use-case.js";
import type { StatusCode } from "hono/utils/http-status";

const adminPreparationRouter = new Hono<AppEnv>();

const partyIdParamSchema = z.object({
  id: z.string().min(1),
});

const announcementSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
});

const confirmStartSchema = z.object({
  forceWithAbsents: z.boolean().optional().default(false),
  overrideReason: z.string().trim().min(1).max(500).optional(),
});

function handleError(c: Parameters<typeof errorResponse>[0], err: unknown) {
  if (err instanceof PreparationUseCaseError) {
    return errorResponse(c, err.httpStatus as StatusCode, err.code, err.message);
  }
  console.error("Unexpected admin preparation error:", err);
  return errorResponse(c, 500 as StatusCode, "INTERNAL", "Erreur interne du serveur");
}

adminPreparationRouter.post(
  "/parties/:id/preparation/open",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  zValidator("param", partyIdParamSchema),
  auditLog("PREPARATION_OPEN", "Party"),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const user = c.get("user");
      const result = await openPreparation({ partyId: id, userId: user.id });
      return successResponse(c, result);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

adminPreparationRouter.post(
  "/parties/:id/preparation/announcement",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  zValidator("param", partyIdParamSchema),
  zValidator("json", announcementSchema),
  auditLog("ANNOUNCEMENT_SEND", "Party"),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const { title, body } = c.req.valid("json");
      const user = c.get("user");
      const result = await sendPreparationAnnouncement({ partyId: id, userId: user.id, title, body });
      return successResponse(c, result, 201);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

adminPreparationRouter.post(
  "/parties/:id/preparation/confirm-start",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  zValidator("param", partyIdParamSchema),
  zValidator("json", confirmStartSchema),
  auditLog("CONFIRM_START", "Party"),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const { forceWithAbsents, overrideReason } = c.req.valid("json");
      const user = c.get("user");
      const result = await confirmStart({ partyId: id, userId: user.id, forceWithAbsents, overrideReason });
      return successResponse(c, result);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

adminPreparationRouter.get(
  "/parties/:id/preparation/state",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  zValidator("param", partyIdParamSchema),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const result = await getPreparationState({ partyId: id });
      return successResponse(c, result);
    } catch (err) {
      return handleError(c, err);
    }
  },
);

export { adminPreparationRouter };
