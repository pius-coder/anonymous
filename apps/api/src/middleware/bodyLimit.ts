import { Context, Next } from "hono";

export const bodyLimit = (limit: number = 1024 * 1024) => {
  return async (c: Context, next: Next) => {
    const contentLength = c.req.header("Content-Length");
    if (contentLength && parseInt(contentLength) > limit) {
      return c.json(
        {
          success: false,
          error: {
            code: "PAYLOAD_TOO_LARGE",
            message: "Request body too large",
          },
        },
        413,
      );
    }
    await next();
  };
};
