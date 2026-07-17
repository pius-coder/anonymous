/**
 * L5 global setup: seed once under exclusive lock before parallel workers start.
 */
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export default async function globalSetup() {
  const monorepoRoot = process.env.MONOREPO_ROOT || join(process.cwd(), "../..");
  const databaseUrl = process.env.DATABASE_URL || process.env.TEST_DATABASE_URL;
  if (!databaseUrl) {
    // Some suites do not need seed (live smoke). Skip quietly.
    return;
  }

  const mod = await import(pathToFileURL(join(monorepoRoot, "scripts/lib/seed-lock.mjs")).href);
  mod.runSeedIsolated({
    ...process.env,
    DATABASE_URL: databaseUrl,
    MONOREPO_ROOT: monorepoRoot,
    APP_ENV: process.env.APP_ENV || "test",
  });
}
