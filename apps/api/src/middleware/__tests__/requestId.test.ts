import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { requestId } from "../requestId.js";

const app = new Hono();
app.use("*", requestId);
app.get("/test", (c) => {
  return c.json({ requestId: c.get("requestId" as never) as string });
});

describe("requestId middleware", () => {
  it("should generate a UUID when no X-Request-Id header", async () => {
    const res = await app.request("/test");
    expect(res.status).toBe(200);
    const headerId = res.headers.get("X-Request-Id");
    expect(headerId).toBeDefined();
    expect(headerId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it("should use provided X-Request-Id header", async () => {
    const customId = "my-custom-id-123";
    const res = await app.request("/test", {
      headers: { "X-Request-Id": customId },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Request-Id")).toBe(customId);
  });

  it("should set requestId in context", async () => {
    const res = await app.request("/test");
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.requestId).toBeDefined();
  });
});
