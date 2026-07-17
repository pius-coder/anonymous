/**
 * Application deployment environment (distinct from NODE_ENV).
 * - local: developer workstation
 * - test: automated tests / harness
 * - staging: pre-production
 * - production: real users / money
 */
export type AppEnv = "local" | "test" | "staging" | "production";

export const APP_ENVS: readonly AppEnv[] = ["local", "test", "staging", "production"] as const;

export function parseAppEnv(raw: string | undefined): AppEnv {
  const value = (raw ?? "").trim().toLowerCase();
  if (value === "local" || value === "development" || value === "dev") return "local";
  if (value === "test" || value === "testing") return "test";
  if (value === "staging" || value === "stage" || value === "preprod") return "staging";
  if (value === "production" || value === "prod") return "production";
  // Fall back: NODE_ENV=production without APP_ENV is production; else local.
  return "local";
}

export function resolveAppEnv(env: NodeJS.ProcessEnv = process.env): AppEnv {
  if (env.APP_ENV) return parseAppEnv(env.APP_ENV);
  if (env.NODE_ENV === "test") return "test";
  if (env.NODE_ENV === "production") return "production";
  return "local";
}

export function isStrictDeployEnv(appEnv: AppEnv): boolean {
  return appEnv === "staging" || appEnv === "production";
}
