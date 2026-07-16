import { describe, expect, it } from "vitest";
import { getWorkerFoundation, QUEUE_NAMES, loadWorkerConfig } from "../index.js";

describe("worker foundation", () => {
  it("exposes bullmq runner and notification job", () => {
    expect(getWorkerFoundation()).toEqual({
      service: "worker",
      foundation: "v0.1",
      jobs: "payment-reconciliation,round-deadline-close,notification-delivery",
      runner: "bullmq",
    });
  });

  it("defines explicit queue names", () => {
    expect(QUEUE_NAMES.NOTIFICATION).toBe("notification-delivery");
    expect(QUEUE_NAMES.ROUND_DEADLINE).toBe("round-deadline-close");
    expect(QUEUE_NAMES.PAYMENT_RECONCILIATION).toBe("payment-reconciliation");
  });

  it("loads explicit max attempts and backoff from env", () => {
    const config = loadWorkerConfig({
      REDIS_URL: "redis://127.0.0.1:6379/2",
      WORKER_MAX_ATTEMPTS: "7",
      WORKER_BACKOFF_DELAY_MS: "2500",
      WORKTREE_ID: "a-workers",
    });
    expect(config.maxAttempts).toBe(7);
    expect(config.backoffDelayMs).toBe(2500);
    expect(config.prefix).toContain("a-workers");
  });
});
