/**
 * L4: real ConnectRPC Identity password-reset surface against running API.
 * Frontiers: HTTP Connect → API handlers (DB live under harness).
 */
import { describe, expect, it } from "vitest";

const apiUrl = (
  process.env.API_URL ||
  `http://127.0.0.1:${process.env.PORT || process.env.API_PORT || 3001}`
).replace(/\/$/, "");

async function connectJson(
  method: string,
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
): Promise<{ status: number; body: unknown; setCookie: string[] }> {
  const res = await fetch(`${apiUrl}/sessionjeu.identity.v1.IdentityService/${method}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "connect-protocol-version": "1",
      ...headers,
    },
    body: JSON.stringify(body),
  });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  let parsed: unknown = null;
  const text = await res.text();
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { raw: text };
  }
  return { status: res.status, body: parsed, setCookie };
}

describe("L4 Identity password reset ConnectRPC", () => {
  it("RequestPasswordReset returns the same success for known and unknown emails", async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const email = `l4-reset-${suffix}@noya.test`;
    const password = "L4ResetPass2026!";

    const register = await connectJson("Register", {
      email,
      password,
      name: "L4 Reset",
    });
    expect(register.status).toBe(200);

    const known = await connectJson("RequestPasswordReset", { email });
    expect(known.status).toBe(200);
    expect(known.body).toEqual({});

    const unknown = await connectJson("RequestPasswordReset", {
      email: `missing-${suffix}@noya.test`,
    });
    expect(unknown.status).toBe(200);
    expect(unknown.body).toEqual({});
  });

  it("ResetPassword rejects invalid tokens with a stable public error", async () => {
    const res = await connectJson("ResetPassword", {
      token: "definitely-not-a-valid-token",
      newPassword: "AnotherStrongPass1!",
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).not.toBe(404);
    const body = res.body as { message?: string; code?: string };
    const message = body.message ?? JSON.stringify(body);
    expect(message.toLowerCase()).toMatch(/invalide|expir|invalid|reset/);
  });
});
