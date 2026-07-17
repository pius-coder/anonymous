/**
 * L4: worker process is started by the integration orchestrator with real Redis.
 * When INTEGRATION_WITH_WORKER=0 the suite is skipped.
 */
import { createConnection } from "node:net";
import { describe, expect, it } from "vitest";

const withWorker = process.env.INTEGRATION_WITH_WORKER === "1";
const redisUrl = process.env.REDIS_URL || "";
const redisPort = Number(process.env.REDIS_PORT || 6379);
const host = process.env.TEST_HOST || process.env.REDIS_HOST || "127.0.0.1";

describe.runIf(withWorker)("L4 worker + Redis harness", () => {
  it("REDIS_URL is configured for the harness (real Redis, not empty)", () => {
    expect(redisUrl.length).toBeGreaterThan(0);
    expect(redisUrl).toMatch(/^redis:\/\//);
  });

  it("Redis TCP port is open for worker/queues", async () => {
    const ok = await new Promise<boolean>((resolve) => {
      const socket = createConnection({ host, port: redisPort }, () => {
        socket.end();
        resolve(true);
      });
      const timer = setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, 5000);
      socket.on("error", () => {
        clearTimeout(timer);
        resolve(false);
      });
      socket.on("connect", () => clearTimeout(timer));
    });
    expect(ok, `Redis must listen on ${host}:${redisPort}`).toBe(true);
  });
});

describe.runIf(!withWorker)("L4 worker harness (disabled)", () => {
  it("skipped when INTEGRATION_WITH_WORKER!=1", () => {
    expect(withWorker).toBe(false);
  });
});
