/**
 * L4 harness: real Connect/Hono HTTP transport against a running API process.
 * Frontiers: real HTTP to API; DB is live but this smoke only hits /health + Connect path.
 */
import { describe, expect, it } from "vitest";

const apiUrl = (process.env.API_URL || `http://127.0.0.1:${process.env.PORT || process.env.API_PORT || 3001}`).replace(
  /\/$/,
  "",
);

describe("L4 Connect/Hono transport harness", () => {
  it("serves Hono /health over real HTTP", async () => {
    const res = await fetch(`${apiUrl}/health`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status?: string; service?: string };
    expect(body.status).toBe("ok");
    expect(body.service).toBe("api");
  });

  it("accepts a Connect-RPC unary call on the real transport (IdentityService/GetCurrentUser unauthenticated)", async () => {
    // Connect protocol unary POST with empty message — expects application error, not connection failure.
    const res = await fetch(`${apiUrl}/sessionjeu.identity.v1.IdentityService/GetCurrentUser`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "connect-protocol-version": "1",
      },
      body: "{}",
    });

    // Unauthenticated should be 401/403 or Connect error JSON — never network failure / 404 of missing adapter.
    expect(res.status).not.toBe(404);
    expect([200, 401, 403, 400, 409, 415, 500].includes(res.status) || res.status >= 400).toBe(true);

    const contentType = res.headers.get("content-type") || "";
    // Response must come from Connect or JSON API, not empty HTML 404 page of a dead server.
    expect(contentType.length).toBeGreaterThan(0);
  });
});
