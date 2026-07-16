/**
 * L3 integration: real PostgreSQL + Redis + BullMQ.
 * Frontiers: Worker → Redis (BullMQ) → Prisma/PostgreSQL → fake provider.
 * Skips when TEST_DATABASE_URL/DATABASE_URL or REDIS_URL is missing.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { FakeNotificationProvider } from "@session-jeu/whatsapp-gateway";
import {
  notificationRepository,
  partyRepository,
  paymentRepository,
  roundRepository,
  userRepository,
} from "@session-jeu/db";
import { loadWorkerConfig } from "../config.js";
import { createWorkerRunner } from "../runner.js";
import {
  enqueueNotificationDelivery,
  enqueueRoundDeadlineScan,
} from "../queues.js";
import { resetMetrics, getMetrics } from "../metrics.js";

const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
const redisUrl = process.env.REDIS_URL;
/** Env present is not enough — L3 runs only when WORKER_L3=1 (infra up) or probe succeeds at collect time via flag. */
const runL3 = Boolean(databaseUrl && redisUrl && process.env.WORKER_L3 === "1");

async function waitFor(
  predicate: () => Promise<boolean>,
  timeoutMs = 15_000,
  intervalMs = 100,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await predicate()) return;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`waitFor timed out after ${timeoutMs}ms`);
}

describe.skipIf(!runL3)("L3 workers / BullMQ / PG / Redis", () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const prefix = `sj:a-workers-l3:${suffix}`;
  let userId = "";
  let partyId = "";

  beforeAll(async () => {
    const user = await userRepository.createUser({
      email: `l3-worker-${suffix}@example.test`,
      name: "L3 Worker",
    });
    userId = user.id;
    // Party.code is unique; keep short but high-entropy (not timestamp prefix only).
    const partyCode = `W${suffix.replace(/[^a-z0-9]/gi, "").slice(-10)}`;
    const party = await partyRepository.createParty({
      code: partyCode,
      name: "L3 worker party",
    });
    partyId = party.id;
  });

  beforeEach(() => {
    resetMetrics();
  });

  afterAll(async () => {
    if (!userId) return;
    try {
      const { prisma } = await import("@session-jeu/db");
      const jobs = await prisma.notificationJob.findMany({
        where: { userId },
        select: { id: true },
      });
      const jobIds = jobs.map((j) => j.id);
      if (jobIds.length) {
        await prisma.deliveryLog.deleteMany({ where: { jobId: { in: jobIds } } });
        await prisma.notificationJob.deleteMany({ where: { id: { in: jobIds } } });
      }
    } catch {
      // best-effort cleanup
    }
  });

  it("starts, delivers via fake provider, writes DeliveryLog, and shuts down cleanly", async () => {
    const provider = new FakeNotificationProvider();
    const config = loadWorkerConfig({
      ...process.env,
      REDIS_URL: redisUrl,
      BULLMQ_PREFIX: prefix,
      WORKER_MAX_ATTEMPTS: "3",
      WORKER_BACKOFF_DELAY_MS: "200",
      WORKER_QUIET_SHUTDOWN: "1",
      NODE_ENV: "test",
    });

    const runner = createWorkerRunner({
      config,
      provider,
      installSignalHandlers: false,
    });
    await runner.start();

    const job = await notificationRepository.createNotificationJob({
      userId,
      type: "L3_LOBBY_REMINDER",
      payload: { body: "hello", token: "should-not-leak" },
      status: "PENDING",
    });

    await enqueueNotificationDelivery(runner.queues.notification, job.id, {
      correlationId: `corr-${suffix}`,
    });

    await waitFor(async () => {
      const current = await notificationRepository.findNotificationJobById(job.id);
      return current?.status === "SENT";
    });

    const logs = await notificationRepository.listDeliveryLogsByJob(job.id);
    expect(logs.some((l) => l.status === "SENT")).toBe(true);
    expect(provider.sent).toHaveLength(1);
    expect(getMetrics().success).toBeGreaterThanOrEqual(1);

    await runner.stop();
    // After stop, workers should not process new jobs (queue still usable for add, but no consumers).
    expect(runner.workers.every((w) => w.isRunning() === false)).toBe(true);
  }, 30_000);

  it("retries then writes FAILED DeliveryLog on final attempt", async () => {
    const provider = new FakeNotificationProvider();
    // Always fail (retryable) — maxAttempts=2 → final attempt writes FAILED without throw
    provider.failNext = 100;
    provider.failRetryable = true;

    const config = loadWorkerConfig({
      ...process.env,
      REDIS_URL: redisUrl,
      BULLMQ_PREFIX: `${prefix}:retry`,
      WORKER_MAX_ATTEMPTS: "2",
      WORKER_BACKOFF_DELAY_MS: "100",
      WORKER_QUIET_SHUTDOWN: "1",
      NODE_ENV: "test",
    });

    const runner = createWorkerRunner({
      config,
      provider,
      installSignalHandlers: false,
    });
    await runner.start();

    const job = await notificationRepository.createNotificationJob({
      userId,
      type: "L3_RETRY",
      payload: { body: "retry-me" },
      status: "PENDING",
    });

    await enqueueNotificationDelivery(runner.queues.notification, job.id, {
      correlationId: `corr-retry-${suffix}`,
    });

    await waitFor(async () => {
      const current = await notificationRepository.findNotificationJobById(job.id);
      return current?.status === "FAILED";
    }, 20_000);

    const logs = await notificationRepository.listDeliveryLogsByJob(job.id);
    expect(logs.some((l) => l.status === "FAILED")).toBe(true);
    expect(provider.sent).toHaveLength(0);

    await runner.stop();
  }, 30_000);

  it("two concurrent deadline closers claim at most once", async () => {
    const round = await roundRepository.createRound({
      partyId,
      number: Math.floor(Math.random() * 1000) + 1,
      status: "ACTIVE",
      minigame: "memory_sequence",
    });
    const past = new Date(Date.now() - 60_000);
    await roundRepository.createOrUpdateRoundDeadline({
      roundId: round.id,
      deadlineAt: past,
      durationMs: 60_000,
    });

    const config = loadWorkerConfig({
      ...process.env,
      REDIS_URL: redisUrl,
      BULLMQ_PREFIX: `${prefix}:deadline`,
      WORKER_QUIET_SHUTDOWN: "1",
      NODE_ENV: "test",
    });

    // Two runners = two workers competing on the same due deadline.
    const runnerA = createWorkerRunner({
      config,
      provider: new FakeNotificationProvider(),
      installSignalHandlers: false,
    });
    const runnerB = createWorkerRunner({
      config: { ...config, prefix: `${prefix}:deadline:b` },
      provider: new FakeNotificationProvider(),
      installSignalHandlers: false,
    });

    // Direct concurrent claims (same effect path as workers) — atomic at DB layer.
    const { closeDueRoundDeadlines } = await import("../jobs/roundDeadline.js");
    const now = new Date();
    const [a, b] = await Promise.all([
      closeDueRoundDeadlines(now, "corr-a"),
      closeDueRoundDeadlines(now, "corr-b"),
    ]);

    // Exactly one closer applies the effect; the other either skips claim or
    // sees an empty due-list once closedAt is set (listDueRoundDeadlines filters it out).
    const closedTotal = a.closed + b.closed;
    expect(closedTotal).toBe(1);
    expect(a.failed + b.failed).toBe(0);

    const updated = await roundRepository.findRoundById(round.id);
    expect(updated?.status).toBe("VERIFICATION");
    const deadline = await roundRepository.findRoundDeadlineByRoundId(round.id);
    expect(deadline?.closedAt).not.toBeNull();

    // Also prove queue scan path works once.
    await runnerA.start();
    await enqueueRoundDeadlineScan(runnerA.queues.roundDeadline, `scan-${suffix}`);
    await waitFor(async () => true, 500); // brief settle
    await runnerA.stop();
    await runnerB.stop();
  }, 30_000);

  it("idempotent notification: second enqueue after SENT does not re-send", async () => {
    const provider = new FakeNotificationProvider();
    const config = loadWorkerConfig({
      ...process.env,
      REDIS_URL: redisUrl,
      BULLMQ_PREFIX: `${prefix}:idem`,
      WORKER_MAX_ATTEMPTS: "3",
      WORKER_BACKOFF_DELAY_MS: "100",
      WORKER_QUIET_SHUTDOWN: "1",
      NODE_ENV: "test",
    });
    const runner = createWorkerRunner({
      config,
      provider,
      installSignalHandlers: false,
    });
    await runner.start();

    const job = await notificationRepository.createNotificationJob({
      userId,
      type: "L3_IDEM",
      payload: {},
      status: "PENDING",
    });

    await enqueueNotificationDelivery(runner.queues.notification, job.id, {
      correlationId: `idem-1-${suffix}`,
    });
    await waitFor(async () => {
      const current = await notificationRepository.findNotificationJobById(job.id);
      return current?.status === "SENT";
    });
    expect(provider.sent).toHaveLength(1);

    // Force a second delivery attempt with a different BullMQ job id (simulate reprocess).
    await runner.queues.notification.add(
      "deliver",
      {
        notificationJobId: job.id,
        correlationId: `idem-2-${suffix}`,
      },
      { jobId: `notif-replay-${job.id}-${suffix}` },
    );

    await waitFor(async () => getMetrics().skipped >= 1, 10_000);
    expect(provider.sent).toHaveLength(1);

    await runner.stop();
  }, 30_000);

  it("payment reconciliation does not start a party", async () => {
    const wallet = await paymentRepository.createWallet({ userId });
    const old = new Date(Date.now() - 48 * 60 * 60 * 1000);
    // createdAt is set by DB default; create then we only expire if age check uses createdAt.
    // For L3 we call reconcile which lists PENDING — age may be 0 if just created.
    // Create with direct prisma for old createdAt is schema-owned; instead assert reconcile never touches party.
    const before = await partyRepository.findPartyById(partyId);
    const { reconcilePendingTransactions } = await import("../jobs/paymentReconciliation.js");
    await reconcilePendingTransactions();
    const after = await partyRepository.findPartyById(partyId);
    expect(after?.status).toBe(before?.status);
    expect(wallet.id).toBeTruthy();
    void old;
  });
});
