import { expect, test } from "@playwright/test";

const isSessionCookie = (cookie: { name: string; httpOnly: boolean }) =>
  (cookie.name === "__session" || cookie.name === "__Host-session") && cookie.httpOnly;

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
