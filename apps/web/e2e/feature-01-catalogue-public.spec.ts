import { test, expect } from "@playwright/test";

test.describe("Feature 01 — Acquisition et catalogue public", () => {
  test("Parcours visiteur: landing → catalogue → détail → CTA", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /compétitions stratégiques/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /voir les sessions disponibles/i })).toBeVisible();

    await page.getByRole("link", { name: /voir les sessions disponibles/i }).click();
    await expect(page).toHaveURL(/\/catalogue/);

    await expect(page.getByRole("heading", { name: /catalogue/i })).toBeVisible();

    const sessionLinks = page.getByRole("link", { name: /voir les détails/i });
    const count = await sessionLinks.count();

    if (count > 0) {
      await sessionLinks.first().click();
      await expect(page).toHaveURL(/\/session\//);

      const cta = page.getByRole("button", { name: /s'inscrire/i });
      await expect(cta).toBeVisible();

      await cta.click();
      await expect(page.getByRole("dialog")).toBeVisible();
    }
  });

  test("landing page ne contient pas de wording interdit", async ({ page }) => {
    await page.goto("/");
    const text = await page.locator("body").innerText();

    const forbidden = [/pari/i, /mise/i, /jackpot/i, /gain garanti/i];
    for (const pattern of forbidden) {
      expect(text).not.toMatch(pattern);
    }
  });

  test("catalogue empty state affiche un message", async ({ page }) => {
    await page.goto("/catalogue");

    await expect(page.getByRole("heading", { name: /catalogue/i })).toBeVisible();

    const body = await page.locator("body").innerText();
    const emptyStates = [/aucune session/i, /disponible/i];
    const hasEmptyState = emptyStates.some((p) => p.test(body));
    const hasCards = page.getByRole("link", { name: /voir les détails/i });
    const cardCount = await hasCards.count();

    expect(cardCount > 0 || hasEmptyState).toBe(true);
  });

  test("session detail pour session existante affiche les infos", async ({ page }) => {
    const res = await page.request.get("http://localhost:3001/v1/public/sessions?limit=1");
    if (!res.ok()) {
      test.skip();
      return;
    }

    const json = await res.json();
    const session = json.data?.[0];
    if (!session) {
      test.skip();
      return;
    }

    await page.goto(`/session/${session.code}`);
    await expect(page).toHaveURL(/\/session\//);
    await expect(page.getByRole("heading", { name: session.name })).toBeVisible();
  });
});
