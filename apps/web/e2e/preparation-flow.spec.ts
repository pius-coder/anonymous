import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test, type BrowserContext } from "@playwright/test";

const host = process.env.TEST_HOST || "127.0.0.1";
const webUrl = (
  process.env.E2E_BASE_URL ||
  process.env.PLAYWRIGHT_BASE_URL ||
  `http://${host}:${process.env.WEB_PORT || "3000"}`
).replace(/\/$/, "");
const apiProxyUrl = `${webUrl}/api`;
const monorepoRoot = process.env.MONOREPO_ROOT || resolve(process.cwd(), "../..");

async function login(context: BrowserContext, email: string) {
  const response = await context.request.post(`${apiProxyUrl}/v1/auth/login`, {
    data: { email, password: "SeedPass123!" },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
}

async function acquireControlLease(context: BrowserContext, partyId: string) {
  const lease = await context.request.post(
    `${apiProxyUrl}/v1/admin/parties/${partyId}/control-lease`,
    { data: { ttlSeconds: 300 } },
  );
  expect(lease.ok(), await lease.text()).toBeTruthy();
}

const SEEDED_FEE_PRODUCT_CODE = "SEED-PARTY-01";

test.describe("L5 preparation flow", () => {
  test.beforeAll(async () => {
    const mod = await import(pathToFileURL(resolve(monorepoRoot, "scripts/lib/seed-lock.mjs")).href);
    mod.runSeedIsolated({
      ...process.env,
      MONOREPO_ROOT: monorepoRoot,
      APP_ENV: process.env.APP_ENV || "test",
    });
  });

  test("admin opens and announces, player becomes ready, admin confirms with an absent", async ({
    browser,
  }, testInfo) => {
    // Unique code avoids CODE_ALREADY_EXISTS on retries / parallel workers.
    const partyCode = `AUR${testInfo.workerIndex}${testInfo.parallelIndex}${Date.now().toString(36).toUpperCase()}`.slice(
      0,
      20,
    );
    const contextOptions = {
      baseURL: webUrl,
      extraHTTPHeaders: { "x-forwarded-proto": "http" },
    };
    const adminContext = await browser.newContext(contextOptions);
    const playerContext = await browser.newContext(contextOptions);
    const absentContext = await browser.newContext(contextOptions);

    try {
      await login(adminContext, "admin@seed.local");
      await login(playerContext, "player1@seed.local");
      await login(absentContext, "player2@seed.local");

      const create = await adminContext.request.post(`${apiProxyUrl}/v1/admin/parties`, {
        data: {
          code: partyCode,
          name: "Aurora Preparation E2E",
          visibility: "public",
          minPlayers: 2,
          maxPlayers: 8,
          entryFeeAmount: 1000,
          entryFeeCurrency: "XAF",
          roundProgram: { rounds: [{ number: 1, minigame: "memory_sequence" }] },
        },
      });
      const created = await create.json();
      expect(create.status(), JSON.stringify(created)).toBe(201);
      const partyId = created.data.id as string;

      // Sensitive admin commands require an exclusive control lease (P-A-ADMIN).
      await acquireControlLease(adminContext, partyId);

      const publish = await adminContext.request.post(
        `${apiProxyUrl}/v1/admin/parties/${partyId}/publish`,
        { data: {} },
      );
      expect(publish.ok(), await publish.text()).toBeTruthy();

      for (const [context, key] of [
        [playerContext, `prep-player-ready-${partyCode}`],
        [absentContext, `prep-player-absent-${partyCode}`],
      ] as const) {
        const registration = await context.request.post(
          `${apiProxyUrl}/v1/parties/${partyCode}/register`,
          { data: { idempotencyKey: key } },
        );
        expect(registration.status(), await registration.text()).toBe(201);
        const registrationBody = await registration.json();
        const participationId = registrationBody.data.id as string;

        const payment = await context.request.post(`${apiProxyUrl}/v1/payments/wallet/pay`, {
          data: {
            productCode: SEEDED_FEE_PRODUCT_CODE,
            partyId,
            participationId,
            reason: `Preparation flow ${partyCode}`,
            idempotencyKey: `${key}-wallet`,
          },
        });
        expect(payment.status(), await payment.text()).toBe(201);
      }

      const adminPage = await adminContext.newPage();
      await adminPage.goto(`/admin/parties/${partyId}/control`);
      await adminPage.getByRole("button", { name: "Ouvrir la préparation" }).click();
      await expect(adminPage.getByText("PREPARATION_OPEN", { exact: true }).first()).toBeVisible();

      await adminPage.getByLabel("Titre").fill("Annonce E2E préparation");
      await adminPage
        .getByLabel("Message de l’annonce")
        .fill("Confirmez votre présence et votre état prêt.");
      await adminPage.getByRole("button", { name: "Envoyer l’annonce" }).click();
      await expect(adminPage.getByText("Annonce E2E préparation").last()).toBeVisible();

      const playerPage = await playerContext.newPage();
      const lobbyResponse = await playerPage.goto(`/parties/${partyCode}/lobby`);
      expect(lobbyResponse?.status()).toBe(200);
      await expect(playerPage.getByText("Annonce E2E préparation")).toBeVisible();
      await playerPage.getByRole("button", { name: "Je suis présent" }).click();
      await expect(playerPage.getByRole("button", { name: "Présence confirmée" })).toBeDisabled();
      await playerPage.getByRole("button", { name: "Je suis prêt" }).click();
      await expect(playerPage.getByRole("button", { name: "Vous êtes prêt" })).toBeDisabled();

      await playerPage.reload();
      await expect(playerPage.getByRole("button", { name: "Présence confirmée" })).toBeDisabled();
      await expect(playerPage.getByRole("button", { name: "Vous êtes prêt" })).toBeDisabled();

      await adminPage.reload();
      await expect(adminPage.getByText("1 absents")).toBeVisible();
      await adminPage.getByRole("checkbox", { name: /Forcer avec 1 absent/ }).check();
      await adminPage
        .getByLabel("Raison d’audit (obligatoire si absents)")
        .fill("Joueur absent vérifié pendant le scénario E2E.");
      await adminPage.getByRole("button", { name: "Confirmer avec absents" }).click();
      await expect(
        adminPage.getByText("PREPARATION_LOCKED", { exact: true }).first(),
      ).toBeVisible();
    } finally {
      await Promise.all([adminContext.close(), playerContext.close(), absentContext.close()]);
    }
  });
});
