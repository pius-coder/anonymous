/**
 * L4 harness: real Colyseus process listening; simulated client reaches the server.
 * No local fallback: failure to connect fails the suite.
 * Full authenticated join requires live tokens (SEQ product lots); this smoke proves boot + accept.
 */
import { createConnection } from "node:net";
import { describe, expect, it } from "vitest";

const host = process.env.TEST_HOST || "127.0.0.1";
const port = Number(process.env.GAME_SERVER_PORT || process.env.GAME_PORT || 3002);

function tcpProbe(ms = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port }, () => {
      socket.end();
      resolve(true);
    });
    const timer = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, ms);
    socket.on("error", () => {
      clearTimeout(timer);
      resolve(false);
    });
    socket.on("connect", () => {
      clearTimeout(timer);
    });
  });
}

describe("L4 Colyseus harness", () => {
  it("game-server TCP port is open (process started by orchestrator)", async () => {
    const ok = await tcpProbe();
    expect(ok, `Colyseus must listen on ${host}:${port} — no local fallback`).toBe(true);
  });

  it("HTTP matchmake endpoint responds (Colyseus is alive)", async () => {
    // Colyseus exposes HTTP on the same port for matchmaking.
    const url = `http://${host}:${port}/matchmake/game_room`;
    let status = 0;
    let networkError = false;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ partyId: "harness-smoke" }),
        signal: AbortSignal.timeout(5000),
      });
      status = res.status;
    } catch {
      networkError = true;
    }

    expect(networkError, "must reach Colyseus HTTP — refuse green without server").toBe(false);
    // 200 matchmake, 4xx validation/auth, or 500 from missing options are all "server up".
    // 000 / networkError is failure. HTML from wrong process is still a response.
    expect(status).toBeGreaterThan(0);
  });
});
