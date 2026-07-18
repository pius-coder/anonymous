#!/usr/bin/env node
import { resolveWorktreeEnv, infraUp, migrateEmptyDb, safeLog } from "./lib/infra.mjs";

const env = resolveWorktreeEnv();
await infraUp(env);
if (process.argv.includes("--migrate")) {
  migrateEmptyDb(env);
}
safeLog("[infra:up] ready", {
  worktree: env.WORKTREE_ID,
  backend: env.TEST_INFRA_BACKEND,
  api: env.API_URL,
  game: env.GAME_WS_URL,
  web: env.E2E_BASE_URL,
  db: env.POSTGRES_DB,
});
// Print exportable env without secrets for shell debugging
const publicKeys = [
  "WORKTREE_ID",
  "WORKTREE_OFFSET",
  "TEST_INFRA_BACKEND",
  "COMPOSE_PROJECT_NAME",
  "POSTGRES_DB",
  "POSTGRES_PORT",
  "REDIS_PORT",
  "REDIS_DB",
  "PORT",
  "API_PORT",
  "API_URL",
  "GAME_SERVER_PORT",
  "GAME_WS_URL",
  "WEB_PORT",
  "WORKER_PORT",
  "E2E_BASE_URL",
];
for (const k of publicKeys) {
  console.log(`${k}=${env[k]}`);
}
