import { expect, test } from "@playwright/test";

/**
 * L5 live smoke — proves multi-service browser path against real Colyseus.
 * Intentionally fails if the game-server webServer did not start.
 * No "Aperçu local" / local-preview fallback may turn this green.
 */

const host = process.env.TEST_HOST || "127.0.0.1";
const gamePort = process.env.GAME_SERVER_PORT || process.env.GAME_PORT || "3002";
const gameWsUrl = process.env.GAME_WS_URL || `ws://${host}:${gamePort}`;
const apiUrl = (process.env.API_URL || `http://${host}:${process.env.API_PORT || process.env.PORT || "3001"}`).replace(
  /\/$/,
  "",
);

test.describe("L5 multi-service live smoke", () => {
  test("API health is reachable (orchestrated webServer)", async ({ request }) => {
    const res = await request.get(`${apiUrl}/health`);
    expect(res.ok(), "API must be up for multi-service smoke").toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe("ok");
  });

  test("Colyseus WebSocket endpoint accepts a connection (no local fallback)", async ({ page }) => {
    // Run the probe inside the browser context so we exercise a real client stack.
    const result = await page.evaluate(async (url) => {
      return await new Promise<{ ok: boolean; error?: string }>((resolve) => {
        let settled = false;
        const finish = (value: { ok: boolean; error?: string }) => {
          if (settled) return;
          settled = true;
          resolve(value);
        };
        try {
          const ws = new WebSocket(url);
          const timer = window.setTimeout(() => {
            try {
              ws.close();
            } catch {
              /* ignore */
            }
            finish({ ok: false, error: "timeout" });
          }, 8000);
          ws.onopen = () => {
            window.clearTimeout(timer);
            ws.close();
            finish({ ok: true });
          };
          ws.onerror = () => {
            window.clearTimeout(timer);
            finish({ ok: false, error: "ws-error" });
          };
        } catch (err) {
          finish({ ok: false, error: String(err) });
        }
      });
    }, gameWsUrl);

    expect(
      result.ok,
      `Live smoke requires Colyseus at ${gameWsUrl.replace(/:[^:@/]+@/, ":***@")}; error=${result.error ?? "none"}`,
    ).toBe(true);
  });
});
