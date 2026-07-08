import type { Context } from "hono";

type ErrorDetails = Record<string, string[]> | Record<string, unknown>;

export function errorResponse(
  c: Context,
  status: 400 | 401 | 403 | 404 | 409 | 410 | 422 | 423 | 429 | 502,
  code: string,
  message: string,
  details?: ErrorDetails,
) {
  return c.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    },
    status,
  );
}

export function successResponse<T>(c: Context, data: T, status: 200 | 201 = 200) {
  return c.json(
    {
      success: true,
      data,
    },
    status,
  );
}
