/**
 * Disposable PostgreSQL + Redis for integration/E2E, scoped by WORKTREE_ID.
 * Teardown is the caller's responsibility (use withInfra).
 */

import { spawn, spawnSync, execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createConnection } from "node:net";
import { resolveWorktreeEnv, safeLog, redactSecrets, toChildEnv } from "./worktree-env.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * @returns {boolean}
 */
export function hasDockerCompose() {
  try {
    const r = spawnSync("docker", ["compose", "version"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return r.status === 0;
  } catch {
    return false;
  }
}

/**
 * @param {ReturnType<typeof resolveWorktreeEnv>} env
 * @returns {"docker" | "local"}
 */
export function detectBackend(env) {
  const forced = (env.TEST_INFRA_BACKEND || process.env.TEST_INFRA_BACKEND || "").toLowerCase();
  if (forced === "docker" || forced === "local") return forced;
  return hasDockerCompose() ? "docker" : "local";
}

/**
 * @param {number} port
 * @param {string} host
 * @param {number} timeoutMs
 */
export function waitForPort(port, host = "127.0.0.1", timeoutMs = 60_000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const socket = createConnection({ port, host }, () => {
        socket.end();
        resolve(undefined);
      });
      socket.on("error", () => {
        socket.destroy();
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timeout waiting for ${host}:${port}`));
        } else {
          setTimeout(tryOnce, 250);
        }
      });
    };
    tryOnce();
  });
}

/**
 * @param {string} url
 * @param {number} timeoutMs
 */
export async function waitForHttpOk(url, timeoutMs = 90_000) {
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return;
    } catch {
      // retry
    }
    if (Date.now() - start > timeoutMs) {
      throw new Error(`Timeout waiting for HTTP ${redactSecrets(url)}`);
    }
    await new Promise((r) => setTimeout(r, 300));
  }
}

/**
 * @param {string[]} args
 * @param {NodeJS.ProcessEnv} env
 */
function dockerCompose(args, env) {
  const files = ["-f", "docker-compose.yml", "-f", "docker-compose.test.yml", "-p", env.COMPOSE_PROJECT_NAME];
  safeLog("[infra:docker]", "compose", ...args);
  const r = spawnSync("docker", ["compose", ...files, ...args], {
    cwd: ROOT,
    env: { ...process.env, ...env },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (r.stdout) process.stdout.write(redactSecrets(r.stdout));
  if (r.stderr) process.stderr.write(redactSecrets(r.stderr));
  if (r.status !== 0) {
    throw new Error(`docker compose ${args.join(" ")} failed with status ${r.status}`);
  }
}

/**
 * @param {ReturnType<typeof resolveWorktreeEnv>} env
 */
async function dockerUp(env) {
  dockerCompose(["up", "-d", "--wait"], env);
  await waitForPort(Number(env.POSTGRES_PORT), env.TEST_HOST, 90_000);
  await waitForPort(Number(env.REDIS_PORT), env.TEST_HOST, 90_000);
}

/**
 * @param {ReturnType<typeof resolveWorktreeEnv>} env
 */
function dockerDown(env) {
  try {
    dockerCompose(["down", "-v", "--remove-orphans"], env);
  } catch (err) {
    safeLog("[infra:docker] teardown warning:", String(err));
  }
}

/**
 * @param {string} sql
 * @param {ReturnType<typeof resolveWorktreeEnv>} env
 * @param {{ database?: string }} [opts]
 */
function localPsql(sql, env, opts = {}) {
  const database = opts.database || "postgres";
  // Prefer peer auth via local socket when password is default and host is loopback.
  const args = ["-v", "ON_ERROR_STOP=1", "-d", database, "-c", sql];
  const r = spawnSync("psql", args, {
    encoding: "utf8",
    env: {
      ...process.env,
      PGHOST: process.env.PGHOST || undefined,
      PGPASSWORD: process.env.PGPASSWORD || env.POSTGRES_PASSWORD,
    },
  });
  if (r.status !== 0) {
    // Fallback TCP with explicit user/password (docker-like defaults or .env)
    const r2 = spawnSync(
      "psql",
      [
        "-h",
        env.TEST_HOST,
        "-p",
        process.env.LOCAL_POSTGRES_PORT || "5432",
        "-U",
        env.POSTGRES_USER,
        "-d",
        database,
        "-v",
        "ON_ERROR_STOP=1",
        "-c",
        sql,
      ],
      {
        encoding: "utf8",
        env: { ...process.env, PGPASSWORD: env.POSTGRES_PASSWORD },
      },
    );
    if (r2.stdout) process.stdout.write(redactSecrets(r2.stdout));
    if (r2.stderr) process.stderr.write(redactSecrets(r2.stderr));
    if (r2.status !== 0) {
      throw new Error(`psql failed: ${redactSecrets(r2.stderr || r.stderr || "")}`);
    }
    return;
  }
  if (r.stdout) process.stdout.write(redactSecrets(r.stdout));
}

/**
 * @param {ReturnType<typeof resolveWorktreeEnv>} env
 */
function localRedis(cmdArgs, env) {
  const port = process.env.LOCAL_REDIS_PORT || "6379";
  const r = spawnSync("redis-cli", ["-h", env.TEST_HOST, "-p", port, "-n", env.REDIS_DB, ...cmdArgs], {
    encoding: "utf8",
  });
  if (r.status !== 0) {
    throw new Error(`redis-cli failed: ${redactSecrets(r.stderr || r.stdout || "")}`);
  }
  return r.stdout?.trim();
}

/**
 * Local backend: unique DB name + Redis logical DB; app ports remain worktree-scoped.
 * Always recreates the database so migrate runs on an empty DB.
 * @param {ReturnType<typeof resolveWorktreeEnv>} env
 */
function localUp(env) {
  const db = env.POSTGRES_DB;
  const qdb = db.replace(/"/g, '""');
  const sdb = db.replace(/'/g, "''");
  safeLog("[infra:local] recreating empty database", db);
  try {
    localPsql(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${sdb}' AND pid <> pg_backend_pid()`,
      env,
    );
  } catch {
    // ignore terminate errors on first run
  }
  try {
    localPsql(`DROP DATABASE IF EXISTS "${qdb}"`, env);
  } catch {
    // ignore
  }
  localPsql(`CREATE DATABASE "${qdb}"`, env);

  // Point DATABASE_URL at local postgres (unix socket peer auth by default)
  const localPgPort = process.env.LOCAL_POSTGRES_PORT || "5432";
  const localRedisPort = process.env.LOCAL_REDIS_PORT || "6379";
  const user = process.env.LOCAL_POSTGRES_USER || process.env.USER || env.POSTGRES_USER;
  const socketDir = process.env.PGHOST || process.env.LOCAL_PG_SOCKET || "/var/run/postgresql";
  // Peer auth works on the unix socket; TCP often requires a password for the same user.
  const usePeer = !process.env.FORCE_POSTGRES_PASSWORD;
  env.DATABASE_URL = usePeer
    ? // Prisma requires a host segment; real socket is selected via ?host=
      `postgresql://${encodeURIComponent(user)}@localhost/${db}?host=${encodeURIComponent(socketDir)}&schema=public`
    : `postgresql://${env.POSTGRES_USER}:${env.POSTGRES_PASSWORD}@${env.TEST_HOST}:${localPgPort}/${db}?schema=public`;
  env.TEST_DATABASE_URL = env.DATABASE_URL;
  env.POSTGRES_PORT = localPgPort;
  env.REDIS_PORT = localRedisPort;
  env.REDIS_URL = `redis://${env.TEST_HOST}:${localRedisPort}/${env.REDIS_DB}`;
  env.REDIS_HOST = env.TEST_HOST;

  localRedis(["FLUSHDB"], env);
  safeLog("[infra:local] redis FLUSHDB on db", env.REDIS_DB);
}

/**
 * @param {ReturnType<typeof resolveWorktreeEnv>} env
 */
function localDown(env) {
  const db = env.POSTGRES_DB;
  try {
    localRedis(["FLUSHDB"], env);
  } catch (err) {
    safeLog("[infra:local] redis teardown warning:", String(err));
  }
  try {
    localPsql(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${db.replace(/'/g, "''")}' AND pid <> pg_backend_pid()`,
      env,
    );
    localPsql(`DROP DATABASE IF EXISTS "${db.replace(/"/g, '""')}"`, env);
    safeLog("[infra:local] dropped database", db);
  } catch (err) {
    safeLog("[infra:local] postgres teardown warning:", String(err));
  }
}

/**
 * @param {ReturnType<typeof resolveWorktreeEnv>} env
 */
export async function infraUp(env) {
  const backend = detectBackend(env);
  env.TEST_INFRA_BACKEND = backend;
  safeLog(`[infra] backend=${backend} worktree=${env.WORKTREE_ID} offset=${env.WORKTREE_OFFSET}`);
  if (backend === "docker") {
    await dockerUp(env);
  } else {
    localUp(env);
  }
  return backend;
}

/**
 * @param {ReturnType<typeof resolveWorktreeEnv>} env
 */
export function infraDown(env) {
  const backend = env.TEST_INFRA_BACKEND || detectBackend(env);
  safeLog(`[infra] teardown backend=${backend}`);
  if (backend === "docker") {
    dockerDown(env);
  } else {
    localDown(env);
  }
}

/**
 * Run prisma migrate deploy against env.DATABASE_URL
 * @param {ReturnType<typeof resolveWorktreeEnv>} env
 */
export function migrateEmptyDb(env) {
  safeLog("[infra] prisma generate + migrate deploy (empty DB)");
  const childEnv = {
    ...process.env,
    ...env,
    DATABASE_URL: env.DATABASE_URL,
  };
  const gen = spawnSync("pnpm", ["--filter", "@session-jeu/db", "exec", "prisma", "generate"], {
    cwd: ROOT,
    env: childEnv,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (gen.stdout) process.stdout.write(redactSecrets(gen.stdout));
  if (gen.stderr) process.stderr.write(redactSecrets(gen.stderr));
  if (gen.status !== 0) {
    throw new Error("prisma generate failed");
  }

  const mig = spawnSync(
    "pnpm",
    ["--filter", "@session-jeu/db", "exec", "prisma", "migrate", "deploy"],
    {
      cwd: ROOT,
      env: childEnv,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  if (mig.stdout) process.stdout.write(redactSecrets(mig.stdout));
  if (mig.stderr) process.stderr.write(redactSecrets(mig.stderr));
  if (mig.status !== 0) {
    throw new Error("prisma migrate deploy failed");
  }
}

/**
 * @param {object} opts
 * @param {string} opts.command
 * @param {string[]} opts.args
 * @param {NodeJS.ProcessEnv} opts.env
 * @param {string} [opts.name]
 */
export function spawnService({ command, args, env, name = "service" }) {
  safeLog(`[service] starting ${name}: ${command} ${args.join(" ")}`);
  const child = spawn(command, args, {
    cwd: ROOT,
    env,
    stdio: ["ignore", "pipe", "pipe"],
    detached: false,
  });
  child.stdout?.on("data", (buf) => process.stdout.write(redactSecrets(buf.toString())));
  child.stderr?.on("data", (buf) => process.stderr.write(redactSecrets(buf.toString())));
  child.on("exit", (code, signal) => {
    safeLog(`[service] ${name} exited code=${code} signal=${signal}`);
  });
  return child;
}

/**
 * @param {import("node:child_process").ChildProcess[]} children
 */
export function stopServices(children) {
  for (const child of children) {
    if (!child.pid) continue;
    try {
      process.kill(child.pid, "SIGTERM");
    } catch {
      // ignore
    }
  }
  // brief grace then SIGKILL
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    const alive = children.some((c) => c.exitCode === null && c.signalCode === null && c.pid);
    if (!alive) break;
    spawnSync("sleep", ["0.1"]);
  }
  for (const child of children) {
    if (child.exitCode === null && child.pid) {
      try {
        process.kill(child.pid, "SIGKILL");
      } catch {
        // ignore
      }
    }
  }
}

/**
 * @template T
 * @param {(ctx: { env: ReturnType<typeof resolveWorktreeEnv>, childEnv: NodeJS.ProcessEnv }) => Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function withInfra(fn) {
  const env = resolveWorktreeEnv();
  let started = false;
  try {
    await infraUp(env);
    started = true;
    migrateEmptyDb(env);
    const childEnv = toChildEnv(env);
    return await fn({ env, childEnv });
  } finally {
    if (started) {
      infraDown(env);
    }
  }
}

export { resolveWorktreeEnv, toChildEnv, safeLog, ROOT, existsSync, execFileSync };
