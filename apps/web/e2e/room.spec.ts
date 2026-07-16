import { expect, test } from "@playwright/test";

test("mounts, controls and remounts the fullscreen Phaser room", async ({ page }) => {
  const email = `room-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@noya.test`;
  const runtimeErrors: string[] = [];

  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      const location = message.location();
      const expectedPreviewFallback = message.text().includes("Failed to load resource")
        && location.url.includes("RealtimeAccessService/CreateLiveAccess");
      if (expectedPreviewFallback) return;
      runtimeErrors.push(`${message.text()}${location.url ? ` (${location.url})` : ""}`);
    }
  });

  await page.goto("/auth/register");
  await page.getByLabel("Nom affiché").fill("Room E2E");
  await page.getByLabel("Adresse email").fill(email);
  await page.getByLabel("Mot de passe").fill("NoyaTest2026!");
  await page.getByRole("checkbox", { name: /J’accepte/ }).click();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page).toHaveURL(/\/parties$/);

  for (let visit = 0; visit < 2; visit += 1) {
    await page.goto("/parties/AURORA-21/room");
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();
    await expect(page.getByLabel("Ouvrir les paramètres")).toBeVisible();
    await expect(page.getByLabel("État réseau: Aperçu local")).toBeVisible();
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

  expect(runtimeErrors).toEqual([]);
});
