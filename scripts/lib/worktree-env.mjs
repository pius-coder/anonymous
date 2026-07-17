/**
 * Resolve WORKTREE_ID and derived ports/URLs for isolated test runs.
 * Never log secrets (passwords, tokens, cookies, secret-bearing URLs).
 */

import { createHash } from "node:crypto";
import { basename } from "node:path";
import { cwd } from "node:process";

const OFFSET_MOD = 200;

/**
 * Ports blocked by WHATWG fetch / Next.js (`next dev` / `next start`).
 * Hitting these makes L5 fail with: Bad port: "N" is reserved for …
 * @see https://nextjs.org/docs/messages/reserved-port
 * @see https://fetch.spec.whatwg.org/#port-blocking
 */
export const NEXT_RESERVED_PORTS = new Set([
  1, 7, 9, 11, 13, 15, 17, 19, 20, 21, 22, 23, 25, 37, 42, 43, 53, 69, 77, 79, 87, 95,
  101, 102, 103, 104, 109, 110, 111, 113, 115, 117, 119, 123, 135, 137, 139, 143, 161,
  179, 389, 427, 465, 512, 513, 514, 515, 526, 530, 531, 532, 540, 548, 554, 556, 563,
  587, 601, 636, 989, 990, 993, 995, 1719, 1720, 1723, 2049, 3659, 4045, 5060, 5061,
  6000, 6566, 6665, 6666, 6667, 6668, 6669, 6697, 10080,
]);

/**
 * @param {string} text
 * @returns {number}
 */
export function stableOffset(text) {
  const hex = createHash("sha256").update(text).digest("hex").slice(0, 8);
  return Number.parseInt(hex, 16) % OFFSET_MOD;
}

/**
 * Map base+offset into a non-reserved port while staying in [base, base+OFFSET_MOD).
 * Deterministic: same base+offset always yields the same safe port.
 *
 * @param {number} base
 * @param {number} offset
 * @returns {number}
 */
export function safePort(base, offset) {
  const start = ((Number(offset) % OFFSET_MOD) + OFFSET_MOD) % OFFSET_MOD;
  for (let i = 0; i < OFFSET_MOD; i++) {
    const candidate = base + ((start + i) % OFFSET_MOD);
    if (!NEXT_RESERVED_PORTS.has(candidate)) {
      return candidate;
    }
  }
  // Fallback outside the window if the entire range were reserved (should not happen).
  return base + OFFSET_MOD + start;
}

/**
 * If an explicit port is reserved (e.g. WEB_PORT=3659), walk upward until free.
 * @param {number} port
 * @returns {number}
 */
export function bumpPastReserved(port) {
  let p = Number(port);
  if (!Number.isFinite(p) || p <= 0) return p;
  let guard = 0;
  while (NEXT_RESERVED_PORTS.has(p) && guard < 1000) {
    p += 1;
    guard += 1;
  }
  return p;
}

/**
 * @param {string | undefined} raw
 * @returns {string}
 */
export function sanitizeWorktreeId(raw) {
  const cleaned = (raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return cleaned || "default";
}

/**
 * @param {string} value
 * @returns {string}
 */
export function redactSecrets(value) {
  if (!value) return value;
  let out = String(value);
  // user:password@ → user:***@
  out = out.replace(/(postgres(?:ql)?:\/\/[^:/\s]+):([^@/\s]+)@/gi, "$1:***@");
  out = out.replace(/(redis:\/\/)(?::[^@/\s]+@|[^:/\s]+:[^@/\s]+@)/gi, "$1***@");
  out = out.replace(
    /\b(password|passwd|token|secret|api[_-]?key|authorization|cookie)\s*[:=]\s*["']?([^\s"',;]+)/gi,
    "$1=***",
  );
  out = out.replace(/\b(Bearer)\s+[A-Za-z0-9._~+/=-]+/gi, "$1 ***");
  out = out.replace(/(__session|__Host-session)=([^;\s]+)/gi, "$1=***");
  return out;
}

/**
 * @param  {...unknown} args
 */
export function safeLog(...args) {
  const line = args
    .map((a) => (typeof a === "string" ? redactSecrets(a) : redactSecrets(JSON.stringify(a))))
    .join(" ");
  console.log(line);
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 */
export function resolveWorktreeEnv(env = process.env) {
  const worktreeId = sanitizeWorktreeId(
    env.WORKTREE_ID || env.GITHUB_RUN_ID || basename(cwd()) || "default",
  );
  const offset =
    env.WORKTREE_OFFSET !== undefined && env.WORKTREE_OFFSET !== ""
      ? Number(env.WORKTREE_OFFSET) % OFFSET_MOD
      : stableOffset(worktreeId);

  // Prefer explicit env overrides; otherwise derive isolated ports and skip Next/fetch reserved ports
  // (e.g. WEB 3500+159 → 3659 apple-sasl breaks Playwright next dev in CI).
  const apiPort = bumpPastReserved(Number(env.API_PORT || env.PORT) || safePort(3100, offset));
  const gameServerPort = bumpPastReserved(
    Number(env.GAME_SERVER_PORT || env.GAME_PORT) || safePort(3300, offset),
  );
  const webPort = bumpPastReserved(Number(env.WEB_PORT) || safePort(3500, offset));
  const workerPort = bumpPastReserved(Number(env.WORKER_PORT) || safePort(3700, offset));
  const postgresPort = Number(env.POSTGRES_PORT) || 15432 + offset;
  const redisPort = Number(env.REDIS_PORT) || 16379 + offset;

  const postgresUser = env.POSTGRES_USER || "postgres";
  const postgresPassword = env.POSTGRES_PASSWORD || "postgres";
  const postgresDb = env.POSTGRES_DB || `session_jeu_wt_${worktreeId.replace(/-/g, "_")}`;
  const redisDb = Number(env.REDIS_DB ?? offset % 16);

  const composeProject = env.COMPOSE_PROJECT_NAME || `sj_${worktreeId}`.replace(/[^a-z0-9_-]/gi, "_");

  const host = env.TEST_HOST || "127.0.0.1";

  // When backend=local and no explicit DATABASE_URL for tests, callers may use peer auth.
  const databaseUrl =
    env.TEST_DATABASE_URL ||
    env.DATABASE_URL ||
    `postgresql://${postgresUser}:${postgresPassword}@${host}:${postgresPort}/${postgresDb}?schema=public`;

  const redisUrl =
    env.REDIS_URL || `redis://${host}:${redisPort}/${redisDb}`;

  const apiUrl = env.API_URL || `http://${host}:${apiPort}`;
  const e2eBaseUrl = env.E2E_BASE_URL || `http://${host}:${webPort}`;
  const gameWsUrl = env.GAME_WS_URL || `ws://${host}:${gameServerPort}`;

  return {
    WORKTREE_ID: worktreeId,
    WORKTREE_OFFSET: String(offset),
    COMPOSE_PROJECT_NAME: composeProject,
    POSTGRES_USER: postgresUser,
    POSTGRES_PASSWORD: postgresPassword,
    POSTGRES_DB: postgresDb,
    POSTGRES_PORT: String(postgresPort),
    REDIS_PORT: String(redisPort),
    REDIS_DB: String(redisDb),
    REDIS_HOST: host,
    REDIS_URL: redisUrl,
    DATABASE_URL: databaseUrl,
    TEST_DATABASE_URL: databaseUrl,
    PORT: String(apiPort),
    API_PORT: String(apiPort),
    API_URL: apiUrl,
    GAME_SERVER_PORT: String(gameServerPort),
    GAME_PORT: String(gameServerPort),
    GAME_WS_URL: gameWsUrl,
    WEB_PORT: String(webPort),
    WORKER_PORT: String(workerPort),
    E2E_BASE_URL: e2eBaseUrl,
    PLAYWRIGHT_BASE_URL: e2eBaseUrl,
    NEXT_PUBLIC_LIVE_ENDPOINT: gameWsUrl,
    NODE_ENV: env.NODE_ENV || "test",
    CI: env.CI || "",
    TEST_INFRA_BACKEND: env.TEST_INFRA_BACKEND || "",
    TEST_HOST: host,
  };
}

/**
 * Merge resolved env into a process env object for child processes.
 * @param {ReturnType<typeof resolveWorktreeEnv>} resolved
 * @param {NodeJS.ProcessEnv} [base]
 */
export function toChildEnv(resolved, base = process.env) {
  return {
    ...base,
    ...resolved,
    // Integration/e2e must start listeners; API/game-server skip listen when NODE_ENV=test.
    NODE_ENV: base.HARNESS_NODE_ENV || "development",
  };
}
