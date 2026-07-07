import { Context, Next } from "hono";
import { randomUUID } from "crypto";

export const requestId = async (c: Context, next: Next) => {
  const id = c.req.header("X-Request-Id") || randomUUID();
  c.set("requestId", id);
  c.header("X-Request-Id", id);
  await next();
};
