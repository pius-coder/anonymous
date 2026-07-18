import { Hono } from "hono";
import type { AppEnv } from "../app-env.js";
import { requireAuth } from "../middleware/auth.js";
import { successResponse, errorResponse } from "../lib/responses.js";
import type { StatusCode } from "hono/utils/http-status";
import { createLiveAccess, LiveAccessUseCaseError } from "../use-cases/live/live-access.use-case.js";

const liveRouter = new Hono<AppEnv>();

function handleError(c: Parameters<typeof errorResponse>[0], err: unknown) {
  if (err instanceof LiveAccessUseCaseError) {
    return errorResponse(c, err.httpStatus as StatusCode, err.code, err.message);
  }
  console.error("Unexpected live access error:", err);
  return errorResponse(c, 500 as StatusCode, "INTERNAL", "Erreur interne du serveur");
}

liveRouter.post("/live/parties/:partyId/access", requireAuth, async (c) => {
  try {
    const user = c.get("user")!;
    const partyId = c.req.param("partyId")!;
    const result = await createLiveAccess({ partyId, userId: user.id });
    return successResponse(c, result, 201);
  } catch (err) {
    return handleError(c, err);
  }
});

export { liveRouter };
