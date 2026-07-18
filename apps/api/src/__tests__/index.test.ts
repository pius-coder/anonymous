import { describe, it, expect } from "vitest";
import app from "../index.js";

describe("api foundation", () => {
  it("exposes a neutral health endpoint", async () => {
    const response = await app.request("/health");
    await expect(response.json()).resolves.toMatchObject({
      status: "ok",
      service: "api",
      foundation: "v0.1",
    });
  });
});

describe("auth routes", () => {
  describe("POST /v1/auth/register", () => {
    it("rejects invalid email", async () => {
      const res = await app.request("/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "invalid", password: "password123" }),
      });
      expect(res.status).toBe(400);
    });

    it("rejects weak password", async () => {
      const res = await app.request("/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@example.com", password: "ab" }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("POST /v1/auth/login", () => {
    it("rejects invalid email", async () => {
      const res = await app.request("/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "invalid", password: "password123" }),
      });
      expect(res.status).toBe(400);
    });

    it("rejects unknown credentials (no DB)", async () => {
      const res = await app.request("/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "nonexistent@test.com", password: "password123" }),
      });
      const body = await res.json();
      expect(body.success).toBe(false);
    });
  });

  describe("GET /v1/me", () => {
    it("returns 401 without session", async () => {
      const res = await app.request("/v1/me");
      expect(res.status).toBe(401);
    });
  });
});
