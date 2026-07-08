# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: feature-01-catalogue-public.spec.ts >> Feature 01 — Acquisition et catalogue public >> Parcours visiteur: landing → catalogue → détail → CTA
- Location: e2e/feature-01-catalogue-public.spec.ts:4:7

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/
Call log:
  - navigating to "http://localhost:3000/", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test.describe("Feature 01 — Acquisition et catalogue public", () => {
  4  |   test("Parcours visiteur: landing → catalogue → détail → CTA", async ({ page }) => {
> 5  |     await page.goto("/");
     |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/
  6  | 
  7  |     await expect(page.getByRole("heading", { name: /compétitions stratégiques/i })).toBeVisible();
  8  |     await expect(page.getByRole("link", { name: /voir les sessions disponibles/i })).toBeVisible();
  9  | 
  10 |     await page.getByRole("link", { name: /voir les sessions disponibles/i }).click();
  11 |     await expect(page).toHaveURL(/\/catalogue/);
  12 | 
  13 |     await expect(page.getByRole("heading", { name: /catalogue/i })).toBeVisible();
  14 | 
  15 |     const sessionLinks = page.getByRole("link", { name: /voir les détails/i });
  16 |     const count = await sessionLinks.count();
  17 | 
  18 |     if (count > 0) {
  19 |       await sessionLinks.first().click();
  20 |       await expect(page).toHaveURL(/\/session\//);
  21 | 
  22 |       await expect(page.getByRole("link", { name: /s'inscrire/i })).toBeVisible();
  23 | 
  24 |       const cta = page.getByRole("link", { name: /s'inscrire/i });
  25 |       const href = await cta.getAttribute("href");
  26 |       expect(href).toContain("/auth/register?next=");
  27 |     }
  28 |   });
  29 | 
  30 |   test("landing page ne contient pas de wording interdit", async ({ page }) => {
  31 |     await page.goto("/");
  32 |     const text = await page.locator("body").innerText();
  33 | 
  34 |     const forbidden = [/pari/i, /mise/i, /jackpot/i, /gain garanti/i];
  35 |     for (const pattern of forbidden) {
  36 |       expect(text).not.toMatch(pattern);
  37 |     }
  38 |   });
  39 | 
  40 |   test("catalogue empty state affiche un message", async ({ page }) => {
  41 |     await page.goto("/catalogue");
  42 | 
  43 |     await page.waitForLoadState("networkidle");
  44 | 
  45 |     const body = await page.locator("body").innerText();
  46 |     const emptyStates = [/aucune session/i, /disponible/i];
  47 |     const hasEmptyState = emptyStates.some((p) => p.test(body));
  48 |     const hasCards = page.getByRole("link", { name: /voir les détails/i });
  49 |     const cardCount = await hasCards.count();
  50 | 
  51 |     expect(cardCount > 0 || hasEmptyState).toBe(true);
  52 |   });
  53 | 
  54 |   test("session detail pour session existante affiche les infos", async ({ page }) => {
  55 |     const res = await page.request.get("http://localhost:3001/v1/public/sessions?limit=1");
  56 |     if (!res.ok()) {
  57 |       test.skip();
  58 |       return;
  59 |     }
  60 | 
  61 |     const json = await res.json();
  62 |     const session = json.data?.[0];
  63 |     if (!session) {
  64 |       test.skip();
  65 |       return;
  66 |     }
  67 | 
  68 |     await page.goto(`/session/${session.code}`);
  69 |     await expect(page).toHaveURL(/\/session\//);
  70 |     await expect(page.getByRole("heading", { name: session.name })).toBeVisible();
  71 |   });
  72 | });
  73 | 
```