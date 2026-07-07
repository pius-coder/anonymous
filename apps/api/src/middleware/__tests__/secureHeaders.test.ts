import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { secureHeaders } from "../secureHeaders.js";

describe("secureHeaders middleware", () => {
  const app = new Hono();
  app.use("*", secureHeaders);
  app.get("/test", (c) => c.json({ ok: true }));

  it("should set X-Content-Type-Options to nosniff", async () => {
    const res = await app.request("/test");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("should set X-Frame-Options to DENY", async () => {
    const res = await app.request("/test");
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
  });

  it("should set X-XSS-Protection", async () => {
    const res = await app.request("/test");
    expect(res.headers.get("X-XSS-Protection")).toBe("1; mode=block");
  });

  it("should set Referrer-Policy", async () => {
    const res = await app.request("/test");
    expect(res.headers.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
  });

  it("should return 200", async () => {
    const res = await app.request("/test");
    expect(res.status).toBe(200);
  });
});
