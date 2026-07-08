import { Hono } from "hono";
import { requireAuth } from "../auth/session.js";
import type { AuthVariables } from "../auth/session.js";
import { successResponse } from "../lib/responses.js";

const me = new Hono<{ Variables: AuthVariables }>();

me.get("/", requireAuth, (c) => {
  const user = c.get("user");
  return successResponse(c, {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
});

export default me;
