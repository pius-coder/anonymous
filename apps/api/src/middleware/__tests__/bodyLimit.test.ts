import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { bodyLimit } from "../bodyLimit.js";

describe("bodyLimit middleware", () => {
  const app = new Hono();
  app.use("*", bodyLimit(100));
  app.post("/test", (c) => c.json({ ok: true }));

  it("should allow requests under the limit", async () => {
    const res = await app.request("/test", {
      method: "POST",
      headers: { "Content-Length": "50" },
      body: "x".repeat(50),
    });
    expect(res.status).toBe(200);
  });

  it("should reject requests over the limit", async () => {
    const res = await app.request("/test", {
      method: "POST",
      headers: { "Content-Length": "200" },
      body: "x".repeat(200),
    });
    expect(res.status).toBe(413);
  });

  it("should return error payload on over limit", async () => {
    const res = await app.request("/test", {
      method: "POST",
      headers: { "Content-Length": "200" },
      body: "x".repeat(200),
    });
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.success).toBe(false);
    const error = body.error as Record<string, unknown>;
    expect(error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("should allow requests without Content-Length", async () => {
    const res = await app.request("/test", {
      method: "POST",
      body: "x".repeat(50),
    });
    expect(res.status).toBe(200);
  });
});

describe("bodyLimit with default limit", () => {
  const app = new Hono();
  app.use("*", bodyLimit());
  app.post("/test", (c) => c.json({ ok: true }));

  it("should use 1MB default limit", async () => {
    const res = await app.request("/test", {
      method: "POST",
      headers: { "Content-Length": "500" },
      body: "x".repeat(500),
    });
    expect(res.status).toBe(200);
  });
});
