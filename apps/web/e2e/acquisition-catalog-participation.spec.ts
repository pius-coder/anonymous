import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";

/**
 * CI `pnpm test:e2e` migrates an empty DB and does not seed.
 * Acquisition catalogue needs at least one published public party — seed is idempotent.
 */
function ensureDeterministicSeed() {
  const monorepoRoot = process.env.MONOREPO_ROOT || join(process.cwd(), "../..");
  const databaseUrl = process.env.DATABASE_URL || process.env.TEST_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL/TEST_DATABASE_URL required to seed acquisition E2E fixtures");
  }

  const result = spawnSync("pnpm", ["--filter", "@session-jeu/db", "db:seed"], {
    cwd: monorepoRoot,
    env: process.env,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(
      `db:seed failed (status ${result.status}): ${result.stderr || result.stdout || "no output"}`,
    );
  }
}

const isSessionCookie = (cookie: { name: string; httpOnly: boolean }) =>
  (cookie.name === "__session" || cookie.name === "__Host-session") && cookie.httpOnly;

async function registerPlayer(page: Page) {
  const email = `acq-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@noya.test`;
  const password = "NoyaTest2026!";

  await page.goto("/auth/register");
  await page.getByLabel("Nom affiché").fill("Acquisition E2E");
  await page.getByLabel("Adresse email").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("checkbox", { name: /J’accepte/ }).click();
  const registerButton = page.getByRole("button", { name: "Créer mon compte" });
  await Promise.all([
    page.waitForResponse((response) => response.url().includes("IdentityService/Register")),
    registerButton.click(),
  ]);
  await expect(page).toHaveURL(/\/parties/);
  expect((await page.context().cookies()).some(isSessionCookie)).toBe(true);
  return { email, password };
}

test.describe("L5 acquisition catalogue → detail → register/cancel", () => {
  test.beforeAll(() => {
    ensureDeterministicSeed();
  });

  test("player browses public catalogue and registers once", async ({ page }) => {
    test.setTimeout(120_000);

    await page.goto("/parties");
    await expect(page.getByRole("heading", { name: /Choisissez votre prochaine partie/i })).toBeVisible();

    // Wait out loading → catalogue with seeded party (Base UI CTAs are buttons, not links).
    const catalogue = page.getByRole("region", { name: "Sessions disponibles" });
    await expect(catalogue).toBeVisible({ timeout: 45_000 });
    await expect(catalogue.getByText("SEED-PARTY-01")).toBeVisible();

    await catalogue.getByRole("button", { name: /Voir la session/i }).first().click();
    await expect(page).toHaveURL(/\/parties\/SEED-PARTY-01/i);

    const reserve = page.getByRole("button", { name: /Réserver ma place/i });
    await expect(reserve).toBeVisible({ timeout: 20_000 });

    const detailUrl = page.url();
    await registerPlayer(page);
    await page.goto(detailUrl);
    await page.getByRole("button", { name: /Réserver ma place/i }).click();
    await expect(page).toHaveURL(/\/participation/);

    const confirm = page.getByRole("button", { name: /Confirmer mon inscription/i });
    await expect(confirm).toBeVisible({ timeout: 20_000 });

    // Double-click: single in-flight mutation + server idempotency key.
    await confirm.dblclick();
    await expect(page.getByText(/Inscription confirmée|Statut serveur/i).first()).toBeVisible({
      timeout: 20_000,
    });

    const cancel = page.getByRole("button", { name: /Annuler mon inscription/i });
    await expect(cancel).toBeVisible();
    await cancel.click();
    await expect(page.getByRole("button", { name: /Confirmer mon inscription/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("unknown party code shows actionable denied state", async ({ page }) => {
    await page.goto("/parties/DOES-NOT-EXIST-ZZZ");
    await expect(
      page.getByRole("heading", { name: /introuvable|non publiée|inaccessible|Impossible de charger/i }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByRole("button", { name: /catalogue|Retour|Réessayer/i }).first(),
    ).toBeVisible();
  });
});
