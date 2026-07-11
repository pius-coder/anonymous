import { expect, test } from "@playwright/test";

test.describe("Feature 03 - Profil et historique joueur", () => {
  test("un visiteur anonyme quitte le chargement du profil", async ({ page }) => {
    await page.goto("/me");

    await expect(page.getByText("Connecte-toi pour voir ton profil.")).toBeVisible();
  });

  test("un visiteur anonyme quitte le chargement de ses sessions", async ({ page }) => {
    await page.goto("/me/sessions");

    await expect(page.getByText("Connecte-toi pour voir tes sessions.")).toBeVisible();
  });
});
