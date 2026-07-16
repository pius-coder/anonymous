#!/usr/bin/env node
/**
 * Playwright webServer entry for Colyseus.
 * Starts the game-server, then serves HTTP 200 on GAME_READY_URL once the TCP port is open.
 * Playwright only treats 2xx URL readiness as success — Colyseus matchmake is not always 2xx on GET.
 */
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { createConnection } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { redactSecrets } from "./lib/worktree-env.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const host = process.env.TEST_HOST || "127.0.0.1";
const gamePort = Number(process.env.GAME_SERVER_PORT || process.env.GAME_PORT || 3002);
const readyPort = Number(process.env.GAME_READY_PORT || gamePort + 10000);

function waitPort(port, timeoutMs = 90_000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const s = createConnection({ host, port }, () => {
        s.end();
        resolve(undefined);
      });
      s.on("error", () => {
        s.destroy();
        if (Date.now() - start > timeoutMs) reject(new Error(`game-server port ${port} timeout`));
        else setTimeout(tick, 200);
      });
    };
    tick();
  });
}

const child = spawn(
  "pnpm",
  ["--filter", "@session-jeu/game-server", "exec", "tsx", "src/index.ts"],
  {
    cwd: ROOT,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  },
);

child.stdout?.on("data", (b) => process.stdout.write(redactSecrets(b.toString())));
child.stderr?.on("data", (b) => process.stderr.write(redactSecrets(b.toString())));
child.on("exit", (code, signal) => {
  console.error(`[e2e-game] game-server exited code=${code} signal=${signal}`);
  process.exit(code ?? 1);
});

await waitPort(gamePort);

const server = createServer((_req, res) => {
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ status: "ok", service: "game-server-ready", port: gamePort }));
});

server.listen(readyPort, host, () => {
  console.log(`[e2e-game] ready probe http://${host}:${readyPort}/health (game ${gamePort})`);
});

const shutdown = () => {
  server.close();
  try {
    child.kill("SIGTERM");
  } catch {
    /* ignore */
  }
  setTimeout(() => {
    try {
      child.kill("SIGKILL");
    } catch {
      /* ignore */
    }
    process.exit(0);
  }, 2000);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
