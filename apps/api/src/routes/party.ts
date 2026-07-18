import { Hono } from "hono";
import type { AppEnv } from "../app-env.js";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { successResponse, errorResponse } from "../lib/responses.js";
import { listPublicParties, getPublicParty, PartyUseCaseError } from "../use-cases/party/party.use-case.js";
import { registerForParty, cancelMyParticipation, getMyParticipation, ParticipationUseCaseError } from "../use-cases/party/participation.use-case.js";
import { requireAuth } from "../middleware/auth.js";
import { auditLog } from "../middleware/audit.js";
import type { StatusCode } from "hono/utils/http-status";

const partyRouter = new Hono<AppEnv>();

const paginationSchema = z.object({
  skip: z.coerce.number().int().min(0).optional().default(0),
  take: z.coerce.number().int().min(1).max(100).optional().default(50),
});

const codeParamSchema = z.object({
  code: z.string().min(1),
});

const registerSchema = z.object({
  idempotencyKey: z.string().optional(),
});

function handleError(c: Parameters<typeof errorResponse>[0], err: unknown) {
  if (err instanceof PartyUseCaseError) {
    return errorResponse(c, err.httpStatus as StatusCode, err.code, err.message);
  }
  if (err instanceof ParticipationUseCaseError) {
    return errorResponse(c, err.httpStatus as StatusCode, err.code, err.message);
  }
  console.error("Unexpected party error:", err);
  return errorResponse(c, 500 as StatusCode, "INTERNAL", "Erreur interne du serveur");
}

partyRouter.get("/parties", zValidator("query", paginationSchema), async (c) => {
  try {
    const { skip, take } = c.req.valid("query");
    const result = await listPublicParties({ skip, take });
    return successResponse(c, result);
  } catch (err) {
    return handleError(c, err);
  }
});

partyRouter.get("/parties/:code", zValidator("param", codeParamSchema), async (c) => {
  try {
    const { code } = c.req.valid("param");
    const result = await getPublicParty({ code });
    return successResponse(c, result);
  } catch (err) {
    return handleError(c, err);
  }
});

partyRouter.post("/parties/:code/register", requireAuth, auditLog("PARTICIPATION_REGISTER", "PartyParticipation"), zValidator("param", codeParamSchema), zValidator("json", registerSchema), async (c) => {
  try {
    const { code } = c.req.valid("param");
    const { idempotencyKey } = c.req.valid("json");
    const user = c.get("user");
    const result = await registerForParty({ code, userId: user.id, idempotencyKey });
    return successResponse(c, result, 201);
  } catch (err) {
    return handleError(c, err);
  }
});

partyRouter.post("/parties/:code/cancel", requireAuth, auditLog("PARTICIPATION_CANCEL", "PartyParticipation"), zValidator("param", codeParamSchema), async (c) => {
  try {
    const { code } = c.req.valid("param");
    const user = c.get("user");
    const result = await cancelMyParticipation({ code, userId: user.id });
    return successResponse(c, result);
  } catch (err) {
    return handleError(c, err);
  }
});

partyRouter.get("/parties/:code/my-participation", requireAuth, zValidator("param", codeParamSchema), async (c) => {
  try {
    const { code } = c.req.valid("param");
    const user = c.get("user");
    const result = await getMyParticipation({ code, userId: user.id });
    return successResponse(c, result);
  } catch (err) {
    return handleError(c, err);
  }
});

export { partyRouter };
