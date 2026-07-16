import { createHash, randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const isSessionCookie = (cookie: { name: string; httpOnly: boolean }) =>
  (cookie.name === "__session" || cookie.name === "__Host-session") && cookie.httpOnly;

function hashOpaqueToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function readResetTokenFromDeliveryJob(
  prisma: PrismaClient,
  email: string,
): Promise<string> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error(`user not found for ${email}`);
  const job = await prisma.notificationJob.findFirst({
    where: { userId: user.id, type: "PASSWORD_RESET" },
    orderBy: { createdAt: "desc" },
  });
  const payload = job?.payload as { token?: string } | null;
  if (!payload?.token) {
    throw new Error("PASSWORD_RESET notification job missing delivery token");
  }
  return payload.token;
}

test("registers a user and signs in again through ConnectRPC", async ({ page }) => {
  const email = `auth-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@noya.test`;
  const password = "NoyaTest2026!";

  await page.goto("/auth/register");
  await page.getByLabel("Nom affiché").fill("Auth E2E");
  await page.getByLabel("Adresse email").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("checkbox", { name: /J’accepte/ }).click();

  const registerButton = page.getByRole("button", { name: "Créer mon compte" });
  await expect(registerButton).toHaveAttribute("type", "submit");

  const [registerResponse] = await Promise.all([
    page.waitForResponse((response) =>
      response.url().includes("IdentityService/Register"),
    ),
    registerButton.click(),
  ]);

  expect(registerResponse.status()).toBe(200);
  await expect(page).toHaveURL(/\/parties$/);
  expect((await page.context().cookies()).some(isSessionCookie)).toBe(true);

  await page.context().clearCookies();
  await page.goto("/auth/login");
  await page.getByLabel("Adresse email").fill(email);
  await page.getByLabel("Mot de passe").fill(password);

  const loginButton = page.getByRole("button", { name: "Se connecter" });
  await expect(loginButton).toHaveAttribute("type", "submit");

  const [loginResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes("IdentityService/Login")),
    loginButton.click(),
  ]);

  expect(loginResponse.status()).toBe(200);
  await expect(page).toHaveURL(/\/parties$/);
  expect((await page.context().cookies()).some(isSessionCookie)).toBe(true);

  const protectedPage = await page.context().newPage();
  let sessionChecks = 0;
  protectedPage.on("request", (request) => {
    if (request.url().includes("IdentityService/GetCurrentUser")) sessionChecks += 1;
  });
  await protectedPage.goto("/parties/AURORA-21/participation");
  await expect(protectedPage.getByRole("heading", { name: "Votre participation" })).toBeVisible();
  await protectedPage.waitForTimeout(500);
  expect(sessionChecks).toBe(1);
});

test("L5 password reset: request → reset → login; old cookie refused", async ({ page, context }) => {
  const databaseUrl = process.env.DATABASE_URL || process.env.TEST_DATABASE_URL;
  test.skip(!databaseUrl, "DATABASE_URL required to read delivery job token");

  const email = `reset-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@noya.test`;
  const oldPassword = "OldNoyaPass2026!";
  const newPassword = "NewNoyaPass2026!";
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

  try {
    // 1) Register (creates session cookie)
    await page.goto("/auth/register");
    await page.getByLabel("Nom affiché").fill("Reset E2E");
    await page.getByLabel("Adresse email").fill(email);
    await page.getByLabel("Mot de passe").fill(oldPassword);
    await page.getByRole("checkbox", { name: /J’accepte/ }).click();
    await Promise.all([
      page.waitForResponse((r) => r.url().includes("IdentityService/Register") && r.status() === 200),
      page.getByRole("button", { name: "Créer mon compte" }).click(),
    ]);
    await expect(page).toHaveURL(/\/parties$/);
    expect((await context.cookies()).some(isSessionCookie)).toBe(true);

    // 2) Request reset — generic success for existing email
    await page.goto("/auth/reset");
    await page.getByLabel("Adresse email").fill(email);
    await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("IdentityService/RequestPasswordReset") && r.status() === 200,
      ),
      page.getByRole("button", { name: "Recevoir le lien" }).click(),
    ]);
    await expect(page.getByText(/Si ce compte existe/i)).toBeVisible();

    // Same UI path for unknown email (enumeration-safe)
    await page.goto("/auth/reset");
    await page.getByLabel("Adresse email").fill(`missing-${randomBytes(4).toString("hex")}@noya.test`);
    await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("IdentityService/RequestPasswordReset") && r.status() === 200,
      ),
      page.getByRole("button", { name: "Recevoir le lien" }).click(),
    ]);
    await expect(page.getByText(/Si ce compte existe/i)).toBeVisible();

    // 3) Delivery job holds opaque token (worker payload only — not in UI/RPC response)
    const resetToken = await readResetTokenFromDeliveryJob(prisma, email.toLowerCase());
    // Stored DB token must be the hash, never the plain value
    const stored = await prisma.passwordResetToken.findUnique({
      where: { token: hashOpaqueToken(resetToken) },
    });
    expect(stored).not.toBeNull();

    // Keep the pre-reset session cookie to prove revocation later
    const oldCookies = await context.cookies();
    expect(oldCookies.some(isSessionCookie)).toBe(true);

    // 4) Confirm reset with new password
    await page.goto(`/auth/reset/confirm?token=${encodeURIComponent(resetToken)}`);
    await page.getByLabel("Nouveau mot de passe").fill(newPassword);
    await page.getByLabel("Confirmer le mot de passe").fill(newPassword);
    await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes("IdentityService/ResetPassword") && r.status() === 200,
      ),
      page.getByRole("button", { name: "Enregistrer le mot de passe" }).click(),
    ]);
    await expect(page.getByText(/Mot de passe mis à jour/i)).toBeVisible();

    // 5) Old cookie is refused on GetCurrentUser
    const me = await page.request.post(
      `${process.env.API_URL || "http://127.0.0.1:3001"}/sessionjeu.identity.v1.IdentityService/GetCurrentUser`,
      {
        headers: {
          "content-type": "application/json",
          "connect-protocol-version": "1",
          cookie: oldCookies.map((c) => `${c.name}=${c.value}`).join("; "),
        },
        data: {},
      },
    );
    expect(me.status()).toBeGreaterThanOrEqual(400);

    // 6) Login with new password works; old password fails
    await context.clearCookies();
    await page.goto("/auth/login");
    await page.getByLabel("Adresse email").fill(email);
    await page.getByLabel("Mot de passe").fill(oldPassword);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.getByText(/incorrect|invalide|erreur/i).first()).toBeVisible({
      timeout: 10_000,
    });

    await page.getByLabel("Mot de passe").fill(newPassword);
    await Promise.all([
      page.waitForResponse((r) => r.url().includes("IdentityService/Login") && r.status() === 200),
      page.getByRole("button", { name: "Se connecter" }).click(),
    ]);
    await expect(page).toHaveURL(/\/parties$/);
  } finally {
    await prisma.$disconnect();
  }
});

test("reset confirm page shows invalid state without token", async ({ page }) => {
  await page.goto("/auth/reset/confirm");
  await expect(page.getByText(/invalide ou expiré/i)).toBeVisible();
  await expect(page.getByText(/Demander un nouveau lien/i)).toBeVisible();
});
