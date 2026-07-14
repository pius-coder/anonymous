import { Hono } from "hono";
import type { AppEnv } from "../app-env.js";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { successResponse, errorResponse } from "../lib/responses.js";
import {
  markPresent,
  markReady,
  leavePreparation,
  getPreparationState,
  PreparationUseCaseError,
} from "../use-cases/preparation/preparation.use-case.js";
import { ParticipationUseCaseError } from "../use-cases/party/participation.use-case.js";
import type { StatusCode } from "hono/utils/http-status";

const preparationRouter = new Hono<AppEnv>();

const codeParamSchema = z.object({
  code: z.string().min(1),
});

function handleError(c: Parameters<typeof errorResponse>[0], err: unknown) {
  if (err instanceof PreparationUseCaseError) {
    return errorResponse(c, err.httpStatus as StatusCode, err.code, err.message);
  }
  if (err instanceof ParticipationUseCaseError) {
    return errorResponse(c, err.httpStatus as StatusCode, err.code, err.message);
  }
  console.error("Unexpected preparation error:", err);
  return errorResponse(c, 500 as StatusCode, "INTERNAL", "Erreur interne du serveur");
}

preparationRouter.post("/parties/:code/preparation/mark-present", requireAuth, zValidator("param", codeParamSchema), async (c) => {
  try {
    const { code } = c.req.valid("param");
    const user = c.get("user");
    const party = await (await import("../use-cases/party/party.use-case.js")).getPublicParty({ code });
    const result = await markPresent({ partyId: party.id, userId: user.id });
    return successResponse(c, result);
  } catch (err) {
    return handleError(c, err);
  }
});

preparationRouter.post("/parties/:code/preparation/mark-ready", requireAuth, zValidator("param", codeParamSchema), async (c) => {
  try {
    const { code } = c.req.valid("param");
    const user = c.get("user");
    const party = await (await import("../use-cases/party/party.use-case.js")).getPublicParty({ code });
    const result = await markReady({ partyId: party.id, userId: user.id });
    return successResponse(c, result);
  } catch (err) {
    return handleError(c, err);
  }
});

preparationRouter.post("/parties/:code/preparation/leave", requireAuth, zValidator("param", codeParamSchema), async (c) => {
  try {
    const { code } = c.req.valid("param");
    const user = c.get("user");
    const party = await (await import("../use-cases/party/party.use-case.js")).getPublicParty({ code });
    const result = await leavePreparation({ partyId: party.id, userId: user.id });
    return successResponse(c, result);
  } catch (err) {
    return handleError(c, err);
  }
});

preparationRouter.get("/parties/:code/preparation", requireAuth, zValidator("param", codeParamSchema), async (c) => {
  try {
    const { code } = c.req.valid("param");
    const user = c.get("user");
    const party = await (await import("../use-cases/party/party.use-case.js")).getPublicParty({ code });
    await (await import("../use-cases/party/participation.use-case.js")).getMyParticipation({ code, userId: user.id });
    const result = await getPreparationState({ partyId: party.id });
    return successResponse(c, result);
  } catch (err) {
    return handleError(c, err);
  }
});

export { preparationRouter };
