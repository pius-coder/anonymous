import { expect, test } from "@playwright/test";

const SEEDED_ROOM_CODE = "SEED-PARTY-01";

/**
 * Hors preuve E2E live Colyseus.
 *
 * The player route is now guarded by real participation + payment state.
 * This suite validates that a newly created account cannot bypass the room guard
 * and does not receive the local preview shell for a published code.
 *
 * Live multi-service proof lives in `live-smoke.spec.ts` (fails if Colyseus is down).
 */
test("blocks room access without an eligible paid participation", async ({ page }) => {
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
    await page.goto(`/parties/${SEEDED_ROOM_CODE}/room`);
    await expect(page.locator("canvas")).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: /Participation active requise|Paiement requis|Accès refusé/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Ouvrir l’inscription|Finaliser le paiement|Reprendre le parcours/i }),
    ).toBeVisible();
    await page.goto("/parties");
  }

  expect(
    runtimeErrors.filter((message) => !message.includes("RealtimeAccessService/CreateLiveAccess")),
  ).toEqual([]);
});
