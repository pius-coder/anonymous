import { expect, test } from "@playwright/test";

/**
 * Hors preuve E2E live Colyseus.
 *
 * This suite validates the room shell and explicit offline state when live access
 * is unavailable. It must NOT be treated as proof of realtime reconnection or
 * authoritative room sync.
 *
 * Live multi-service proof lives in `live-smoke.spec.ts` (fails if Colyseus is down).
 */
test("mounts, controls and remounts the fullscreen Phaser room with explicit offline state", async ({ page }) => {
  const roomPartyCode = "AURORA-21";
  const email = `room-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@noya.test`;
  const runtimeErrors: string[] = [];

  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      const location = message.location();
      runtimeErrors.push(`${message.text()}${location.url ? ` (${location.url})` : ""}`);
    }
  });

  await page.goto("/auth/register");
  await page.getByLabel("Nom affiché").fill("Room E2E");
  await page.getByLabel("Adresse email").fill(email);
  await page.getByLabel("Mot de passe").fill("NoyaTest2026!");
  await page.getByRole("checkbox", { name: /J’accepte/ }).click();
  await Promise.all([
    page.waitForResponse((response) => response.url().includes("IdentityService/Register")),
    page.getByRole("button", { name: "Créer mon compte" }).click(),
  ]);
  await expect(page).toHaveURL(/\/parties$/);

  for (let visit = 0; visit < 2; visit += 1) {
    await page.goto(`/parties/${roomPartyCode}/room`);
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();
    await expect(page.getByLabel("Ouvrir les paramètres")).toBeVisible();
    await expect(page.getByLabel("État réseau: Hors ligne")).toBeVisible();
    expect(await canvas.evaluate((element) => {
      const target = element as HTMLCanvasElement;
      return target.width > 0 && target.height > 0;
    })).toBe(true);
    await page.keyboard.press("ArrowRight");
    await page.getByLabel("Voir les joueurs").click();
    await expect(page.getByRole("heading", { name: "Présents" })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.goto("/parties");
  }

  expect(
    runtimeErrors.filter((message) => !message.includes("RealtimeAccessService/CreateLiveAccess")),
  ).toEqual([]);
});
