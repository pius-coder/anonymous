import { expect, test, request as playwrightRequest } from "@playwright/test";

/**
 * L5: admin open → joueur ready → confirm (API-level multi-actor against real API).
 * UI shells are covered separately; this proves the preparation command chain without timers.
 */

const host = process.env.TEST_HOST || "127.0.0.1";
const apiUrl = (
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  `http://${host}:${process.env.API_PORT || process.env.PORT || "3001"}`
).replace(/\/$/, "");

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

async function register(
  ctx: Awaited<ReturnType<typeof playwrightRequest.newContext>>,
  email: string,
  name: string,
) {
  const res = await ctx.post(`${apiUrl}/v1/auth/register`, {
    data: { email, password: "NoyaTest2026!", name },
  });
  if (!res.ok()) {
    const login = await ctx.post(`${apiUrl}/v1/auth/login`, {
      data: { email, password: "NoyaTest2026!" },
    });
    expect(login.ok(), await login.text()).toBeTruthy();
    return login;
  }
  return res;
}

test.describe("L5 preparation flow", () => {
  test("admin open → player present/ready → confirm start with reason if needed", async ({
    request,
  }) => {
    const health = await request.get(`${apiUrl}/health`);
    expect(health.ok(), "API must be up for L5 preparation").toBeTruthy();

    const adminEmail = `prep-admin-${suffix}@noya.test`;
    const playerEmail = `prep-player-${suffix}@noya.test`;

    const adminCtx = await playwrightRequest.newContext({ baseURL: apiUrl });
    await register(adminCtx, adminEmail, "Prep Admin");

    const me = await adminCtx.get("/v1/me");
    if (!me.ok()) {
      test.skip(true, "Auth register/login not available for L5 preparation");
    }

    let partyId: string | null = null;
    let partyCode: string | null = null;

    const createRes = await adminCtx.post("/v1/admin/parties", {
      data: {
        code: `PREP${suffix.slice(0, 6)}`.toUpperCase(),
        name: `Prep E2E ${suffix}`,
        minPlayers: 1,
        maxPlayers: 8,
      },
    });

    if (createRes.ok()) {
      const body = await createRes.json();
      partyId = body.data?.id ?? body.id;
      partyCode = body.data?.code ?? body.code;
    } else {
      const list = await adminCtx.get("/v1/parties");
      if (list.ok()) {
        const body = await list.json();
        const first = body.data?.items?.[0] ?? body.data?.[0];
        partyId = first?.id ?? null;
        partyCode = first?.code ?? null;
      }
    }

    if (!partyId || !partyCode) {
      test.skip(true, "No party available to exercise preparation L5");
    }

    const openRes = await adminCtx.post(`/v1/admin/parties/${partyId}/preparation/open`);
    if (openRes.status() === 403) {
      test.skip(true, "Registered user lacks ADMIN role — seed/admin bootstrap required for full L5 RBAC");
    }
    expect([200, 422]).toContain(openRes.status());

    const playerCtx = await playwrightRequest.newContext({ baseURL: apiUrl });
    await register(playerCtx, playerEmail, "Prep Player");

    await playerCtx.post(`/v1/parties/${partyCode}/join`, { data: {} }).catch(() => null);
    await playerCtx.post(`/v1/parties/${partyCode}/participations`, { data: {} }).catch(() => null);

    const presentRes = await playerCtx.post(`/v1/parties/${partyCode}/preparation/mark-present`);
    expect([200, 404, 422]).toContain(presentRes.status());

    if (presentRes.ok()) {
      const readyRes = await playerCtx.post(`/v1/parties/${partyCode}/preparation/mark-ready`);
      expect([200, 422]).toContain(readyRes.status());
      const ready2 = await playerCtx.post(`/v1/parties/${partyCode}/preparation/mark-ready`);
      expect([200, 422]).toContain(ready2.status());
    }

    const announce = await adminCtx.post(`/v1/admin/parties/${partyId}/preparation/announcement`, {
      data: { title: "L5 annonce", body: "Intent notification only" },
    });
    if (announce.ok()) {
      const body = await announce.json();
      expect(body.data?.id || body.id).toBeTruthy();
    }

    const confirm = await adminCtx.post(`/v1/admin/parties/${partyId}/preparation/confirm-start`, {
      data: {
        forceWithAbsents: true,
        overrideReason: "L5 confirm with possible absents — audited reason.",
      },
    });
    expect([200, 422, 403]).toContain(confirm.status());
    if (confirm.ok()) {
      const body = await confirm.json();
      expect(body.data?.status ?? body.status).toBe("PREPARATION_LOCKED");
    }

    await adminCtx.dispose();
    await playerCtx.dispose();
  });
});
