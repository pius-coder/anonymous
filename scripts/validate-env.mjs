#!/usr/bin/env node
/**
 * CLI: validate service environment (fail-fast for staging/production).
 * Usage: node scripts/validate-env.mjs --service api [--json]
 *        node scripts/validate-env.mjs --report production
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function ensureBuilt() {
  const dist = join(ROOT, "packages/config/dist/index.js");
  try {
    return import(pathToFileURL(dist).href);
  } catch {
    const build = spawnSync("pnpm", ["--filter", "@session-jeu/config", "build"], {
      cwd: ROOT,
      stdio: "inherit",
    });
    if (build.status !== 0) process.exit(build.status ?? 1);
    return import(pathToFileURL(dist).href);
  }
}

const args = process.argv.slice(2);
const json = args.includes("--json");
const reportIdx = args.indexOf("--report");
const serviceIdx = args.indexOf("--service");

const mod = await ensureBuilt();
const { validateServiceEnv, formatRequiredVarsReport, resolveAppEnv } = mod;

if (reportIdx !== -1) {
  const appEnv = args[reportIdx + 1] || "production";
  process.stdout.write(formatRequiredVarsReport(appEnv));
  process.exit(0);
}

const service = serviceIdx !== -1 ? args[serviceIdx + 1] : "api";
const result = validateServiceEnv({ service, env: process.env });

if (json) {
  // Never dump env values — only issues and names
  console.log(
    JSON.stringify(
      {
        ok: result.ok,
        appEnv: result.appEnv,
        service: result.service,
        requiredVars: result.requiredVars,
        issues: result.issues,
      },
      null,
      2,
    ),
  );
} else {
  console.log(`APP_ENV=${result.appEnv} service=${result.service} ok=${result.ok}`);
  console.log(`required: ${result.requiredVars.join(", ") || "(none)"}`);
  for (const issue of result.issues) {
    console.log(`[${issue.severity}] ${issue.code}: ${issue.message}`);
  }
}

process.exit(result.ok ? 0 : 1);
