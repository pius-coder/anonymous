import { Hono } from "hono";
import type { AppEnv } from "../app-env.js";
import { requireAuth } from "../middleware/auth.js";
import { successResponse } from "../lib/responses.js";

const meRouter = new Hono<AppEnv>();

meRouter.get("/me", requireAuth, async (c) => {
  const user = c.get("user");
  return successResponse(c, { user });
});

export { meRouter };
