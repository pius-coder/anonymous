import { describe, expect, it, beforeEach } from "vitest";
import { Hono } from "hono";
import { rateLimit, resetRateLimitBuckets } from "../rateLimit.js";

describe("rateLimit middleware", () => {
  beforeEach(() => {
    resetRateLimitBuckets();
  });

  it("limits repeated requests by scope and client IP", async () => {
    const app = new Hono();
    app.use("*", rateLimit({ scope: "test", limit: 2, windowMs: 60_000 }));
    app.post("/sensitive", (c) => c.json({ ok: true }));

    const headers = { "x-real-ip": "10.0.0.1" };
    expect((await app.request("/sensitive", { method: "POST", headers })).status).toBe(200);
    expect((await app.request("/sensitive", { method: "POST", headers })).status).toBe(200);

    const limited = await app.request("/sensitive", { method: "POST", headers });
    expect(limited.status).toBe(429);
    const body = await limited.json();
    expect(body.error.code).toBe("429_RATE_LIMITED");
  });
});
