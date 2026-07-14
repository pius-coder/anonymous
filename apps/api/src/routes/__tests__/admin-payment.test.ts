import { describe, it, expect } from "vitest";
import app from "../../index.js";

describe("GET /v1/admin/payments", () => {
  it("returns 401 without session", async () => {
    const res = await app.request("/v1/admin/payments");
    expect(res.status).toBe(401);
  });
});

describe("GET /v1/admin/payments/:id", () => {
  it("returns 401 without session", async () => {
    const res = await app.request("/v1/admin/payments/some-id");
    expect(res.status).toBe(401);
  });
});

describe("POST /v1/admin/payments/:id/reconcile", () => {
  it("returns 401 without session", async () => {
    const res = await app.request("/v1/admin/payments/some-id/reconcile", {
      method: "POST",
    });
    expect(res.status).toBe(401);
  });
});
