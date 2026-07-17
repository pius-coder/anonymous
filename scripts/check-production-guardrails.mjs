#!/usr/bin/env node
/**
 * Scan selected runtime sources and built artifacts for production-forbidden
 * markers (localhost defaults, fapshi-local, seed credentials, fake providers).
 *
 * Exit 1 on hits when APP_ENV=staging|production or --strict.
 */
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const strict =
  process.argv.includes("--strict") ||
  ["production", "staging"].includes((process.env.APP_ENV || "").toLowerCase());

async function loadGuards() {
  const dist = join(ROOT, "packages/config/dist/index.js");
  if (!existsSync(dist)) {
    spawnSync("pnpm", ["--filter", "@session-jeu/config", "build"], {
      cwd: ROOT,
      stdio: "inherit",
    });
  }
  return import(pathToFileURL(dist).href);
}

const SCAN_GLOBS = [
  "apps/api/src/index.ts",
  "apps/api/src/payments/provider-adapter.ts",
  "apps/game-server/src/config.ts",
  "apps/game-server/src/index.ts",
  "apps/worker/src/index.ts",
  "apps/web/next.config.ts",
  "apps/api/dist",
  "apps/game-server/dist",
  "apps/worker/dist",
  "apps/web/.next",
];

/**
 * @param {string} dir
 * @param {string[]} acc
 */
function walkJs(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "cache") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkJs(full, acc);
    else if (/\.(js|mjs|cjs|ts)$/.test(entry.name) && !entry.name.endsWith(".test.ts")) {
      acc.push(full);
    }
  }
  return acc;
}

const { findForbiddenDeployValue, scanTextForProductionLeaks } = await loadGuards();

/** @type {import('../packages/config/src/guards.ts').GuardHit[]} */
const hits = [];

// Runtime paths must gate local fallbacks with isStrictDeployEnv / APP_ENV checks.
const criticalFiles = [
  "apps/game-server/src/config.ts",
  "apps/api/src/payments/provider-adapter.ts",
  "apps/api/src/use-cases/live/live-access.use-case.ts",
  "apps/web/next.config.ts",
];

for (const rel of criticalFiles) {
  const full = join(ROOT, rel);
  if (!existsSync(full)) continue;
  const text = readFileSync(full, "utf8");
  const hasStrictGate =
    /isStrictDeployEnv|APP_ENV|staging\/production|no localhost default/i.test(text);
  if (/fapshi-local|redis:\/\/localhost|ws:\/\/localhost|http:\/\/localhost/i.test(text) && !hasStrictGate) {
    hits.push({
      rule: "unguarded_local_fallback",
      value: "local fallback without strict env gate",
      field: rel,
    });
  }
}

// Scan built artifacts when present (strict mode)
if (strict) {
  for (const target of ["apps/api/dist", "apps/game-server/dist", "apps/worker/dist"]) {
    const files = walkJs(join(ROOT, target));
    for (const file of files) {
      let text = "";
      try {
        text = readFileSync(file, "utf8");
      } catch {
        continue;
      }
      // Built code may still contain strings from error messages; focus on runtime emission markers
      if (/fapshi-local/i.test(text)) {
        hits.push({
          rule: "fapshi_local_artifact",
          value: "fapshi-local",
          field: relative(ROOT, file),
        });
      }
      if (/SeedPass123!/.test(text)) {
        hits.push({
          rule: "seed_password_artifact",
          value: "SeedPass123!",
          field: relative(ROOT, file),
        });
      }
    }
  }
}

// Env process scan
for (const [key, value] of Object.entries(process.env)) {
  if (!value || typeof value !== "string") continue;
  if (!/URL|HOST|ENDPOINT|FAPSHI|PROVIDER|DATABASE|REDIS/i.test(key)) continue;
  hits.push(...findForbiddenDeployValue(value, key));
}

const unique = [];
const seen = new Set();
for (const h of hits) {
  const k = `${h.rule}|${h.field}|${h.value}`;
  if (seen.has(k)) continue;
  seen.add(k);
  unique.push(h);
}

if (unique.length === 0) {
  console.log("[guardrails] ok — no forbidden production markers in scope");
  process.exit(0);
}

console.error(`[guardrails] ${unique.length} hit(s):`);
for (const h of unique) {
  console.error(`  - ${h.rule} @ ${h.field ?? "?"} :: ${h.value}`);
}

if (strict) {
  process.exit(1);
}

// Non-strict: report but do not fail local dev (sources still have localhost defaults).
// CI production/staging jobs pass --strict.
console.error("[guardrails] non-strict mode: reported only (use --strict to fail)");
process.exit(0);
