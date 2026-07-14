import type { Context } from "hono";
import type { StatusCode } from "hono/utils/http-status";

export function successResponse<T>(c: Context, data: T, status: StatusCode = 200): Response {
  c.status(status);
  return c.json({ success: true, data });
}

export function errorResponse(c: Context, status: StatusCode, code: string, message: string, details?: unknown): Response {
  c.status(status);
  return c.json({ success: false, error: { code, message, ...(details ? { details } : {}) } });
}
