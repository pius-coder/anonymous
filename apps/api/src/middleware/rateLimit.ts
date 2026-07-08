import type { MiddlewareHandler } from "hono";
import { getClientIp } from "../auth/session.js";
import { errorResponse } from "../lib/responses.js";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function resetRateLimitBuckets() {
  buckets.clear();
}

export function rateLimit(input: {
  scope: string;
  limit: number;
  windowMs: number;
}): MiddlewareHandler {
  return async (c, next) => {
    const key = `${input.scope}:${getClientIp(c) ?? "anonymous"}`;
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + input.windowMs });
      await next();
      return;
    }

    bucket.count += 1;
    if (bucket.count > input.limit) {
      return errorResponse(c, 429, "429_RATE_LIMITED", "Rate limit exceeded", {
        scope: input.scope,
        resetAt: new Date(bucket.resetAt).toISOString(),
      });
    }

    await next();
  };
}
