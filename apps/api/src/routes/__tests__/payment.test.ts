import { describe, it, expect } from "vitest";
import app from "../../index.js";

describe("POST /v1/payments/initiate", () => {
  it("returns 401 without session", async () => {
    const res = await app.request("/v1/payments/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 1000 }),
    });
    expect(res.status).toBe(401);
  });
});

describe("POST /v1/payments/wallet/pay", () => {
  it("returns 401 without session", async () => {
    const res = await app.request("/v1/payments/wallet/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 500, reason: "Inscription tournoi" }),
    });
    expect(res.status).toBe(401);
  });
});

describe("GET /v1/payments/:id/status", () => {
  it("returns 401 without session", async () => {
    const res = await app.request("/v1/payments/unknown-id/status");
    expect(res.status).toBe(401);
  });
});

describe("GET /v1/wallet", () => {
  it("returns 401 without session", async () => {
    const res = await app.request("/v1/wallet");
    expect(res.status).toBe(401);
  });
});

describe("GET /v1/wallet/ledger", () => {
  it("returns 401 without session", async () => {
    const res = await app.request("/v1/wallet/ledger");
    expect(res.status).toBe(401);
  });
});

describe("POST /v1/payments/webhook/fapshi", () => {
  it("rejects invalid webhook payload", async () => {
    const res = await app.request("/v1/payments/webhook/fapshi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("rejects webhook without required fields", async () => {
    const res = await app.request("/v1/payments/webhook/fapshi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "SUCCESS" }),
    });
    expect(res.status).toBe(400);
  });
});
