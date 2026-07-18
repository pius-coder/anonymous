import { Hono } from "hono";
import type { AppEnv } from "../app-env.js";
import { requireAuth } from "../middleware/auth.js";
import { successResponse } from "../lib/responses.js";
import { listMyTickets } from "../use-cases/party/participation.use-case.js";

const meRouter = new Hono<AppEnv>();

meRouter.get("/me", requireAuth, async (c) => {
  const user = c.get("user");
  return successResponse(c, { user });
});

meRouter.get("/me/tickets", requireAuth, async (c) => {
  const user = c.get("user");
  const tickets = await listMyTickets(user.id);
  return successResponse(c, { tickets });
});

export { meRouter };
