import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import health from "../health.js";

describe("Health Route", () => {
  const app = new Hono();
  app.route("/health", health);

  it("should return 200 status", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
  });

  it("should return JSON content type", async () => {
    const res = await app.request("/health");
    expect(res.headers.get("content-type")).toContain("application/json");
  });

  it("should return status ok", async () => {
    const res = await app.request("/health");
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.status).toBe("ok");
  });

  it("should return timestamp", async () => {
    const res = await app.request("/health");
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.timestamp).toBeDefined();
    expect(new Date(body.timestamp as string).getTime()).not.toBeNaN();
  });

  it("should return uptime", async () => {
    const res = await app.request("/health");
    const body = (await res.json()) as Record<string, unknown>;
    expect(typeof body.uptime).toBe("number");
    expect(body.uptime).toBeGreaterThanOrEqual(0);
  });
});
