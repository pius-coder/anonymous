import { test, expect, type Page } from "@playwright/test";

function collectHydrationErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && /hydration/i.test(message.text())) {
      errors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    if (/hydration/i.test(error.message)) errors.push(error.message);
  });
  return errors;
}

test.describe("Feature 01 — Acquisition et catalogue public", () => {
  test("Parcours visiteur: landing → catalogue → détail → CTA", async ({ page }) => {
    const hydrationErrors = collectHydrationErrors(page);
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /compétitions stratégiques/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /voir les sessions disponibles/i })).toBeVisible();

    await page.getByRole("link", { name: /voir les sessions disponibles/i }).click();
    await expect(page).toHaveURL(/\/catalogue/);

    await expect(page.getByText("Filtres", { exact: true })).toBeVisible();

    const sessionLinks = page.getByRole("link", { name: /voir les détails/i });
    await expect(sessionLinks.first()).toBeVisible();
    await sessionLinks.first().click();
    await expect(page).toHaveURL(/\/session\//);

    const cta = page.getByRole("button", { name: /s'inscrire/i });
    await expect(cta).toBeVisible();

    await cta.click();
    await expect(page.getByRole("dialog")).toBeVisible();

    expect(hydrationErrors).toEqual([]);
  });

  test("landing page ne contient pas de wording interdit", async ({ page }) => {
    await page.goto("/");
    const text = await page.locator("body").innerText();

    const forbidden = [/pari/i, /mise/i, /jackpot/i, /gain garanti/i];
    for (const pattern of forbidden) {
      expect(text).not.toMatch(pattern);
    }
  });

  test("catalogue affiche des sessions ou son état vide", async ({ page }) => {
    await page.goto("/catalogue");

    await expect(page.getByText("Filtres", { exact: true })).toBeVisible();

    const body = await page.locator("body").innerText();
    const emptyStates = [/aucune session/i, /disponible/i];
    const hasEmptyState = emptyStates.some((p) => p.test(body));
    const hasCards = page.getByRole("link", { name: /voir les détails/i });
    const cardCount = await hasCards.count();

    expect(cardCount > 0 || hasEmptyState).toBe(true);
  });

  test("session detail pour session existante affiche les infos", async ({ page }) => {
    const res = await page.request.get("http://localhost:3001/v1/public/sessions?limit=1");
    expect(res.ok()).toBe(true);

    const json = (await res.json()) as {
      data?: { sessions?: Array<{ code: string; name: string }> };
    };
    const session = json.data?.sessions?.[0];
    expect(session).toBeDefined();
    if (!session) throw new Error("Expected a seeded public session");

    await page.goto(`/session/${session.code}`);
    await expect(page).toHaveURL(/\/session\//);
    await expect(page.getByRole("heading", { name: session.name })).toBeVisible();
  });
});
