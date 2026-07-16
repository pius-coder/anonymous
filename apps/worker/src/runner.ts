import { Worker, type Job } from "bullmq";
import type { NotificationProvider } from "@session-jeu/whatsapp-gateway";
import {
  FakeNotificationProvider,
  createProductionProviderFromEnv,
} from "@session-jeu/whatsapp-gateway";
import { QUEUE_NAMES, loadWorkerConfig, type WorkerRuntimeConfig } from "./config.js";
import {
  deliverNotificationJob,
  type NotificationDeliveryPayload,
  RetryableDeliveryError,
} from "./jobs/notificationDelivery.js";
import { closeDueRoundDeadlines } from "./jobs/roundDeadline.js";
import { reconcilePendingTransactions } from "./jobs/paymentReconciliation.js";
import { log, newCorrelationId } from "./logging.js";
import { createBullConnection } from "./redis.js";
import {
  closeQueues,
  createQueues,
  type WorkerQueues,
} from "./queues.js";
import { getMetrics } from "./metrics.js";

export type RunnerDeps = {
  config?: WorkerRuntimeConfig;
  provider?: NotificationProvider;
  /** When false, do not attach process signal handlers (tests). */
  installSignalHandlers?: boolean;
};

export type WorkerRunner = {
  config: WorkerRuntimeConfig;
  queues: WorkerQueues;
  workers: Worker[];
  provider: NotificationProvider;
  start: () => Promise<void>;
  stop: () => Promise<void>;
};

function resolveProvider(explicit?: NotificationProvider): NotificationProvider {
  if (explicit) return explicit;
  if (process.env.NOTIFICATION_PROVIDER === "fake") {
    return new FakeNotificationProvider();
  }
  return createProductionProviderFromEnv();
}

export function createWorkerRunner(deps: RunnerDeps = {}): WorkerRunner {
  const config = deps.config ?? loadWorkerConfig();
  const provider = resolveProvider(deps.provider);
  const queues = createQueues(config);
  const workers: Worker[] = [];
  let started = false;
  let stopping = false;

  const notificationWorker = new Worker(
    QUEUE_NAMES.NOTIFICATION,
    async (job: Job<NotificationDeliveryPayload>) => {
      const attempt = (job.attemptsMade ?? 0) + 1;
      const payload: NotificationDeliveryPayload = {
        ...job.data,
        correlationId: job.data.correlationId || newCorrelationId("notif"),
      };
      try {
        return await deliverNotificationJob(payload, {
          provider,
          channel: payload.channel ?? config.defaultChannel,
          attempt,
          maxAttempts: job.opts.attempts ?? config.maxAttempts,
        });
      } catch (err) {
        if (err instanceof RetryableDeliveryError) {
          throw err;
        }
        throw err;
      }
    },
    {
      connection: createBullConnection(config),
      prefix: config.prefix,
      concurrency: config.concurrency,
    },
  );

  const deadlineWorker = new Worker(
    QUEUE_NAMES.ROUND_DEADLINE,
    async (job: Job<{ correlationId?: string }>) => {
      const correlationId = job.data?.correlationId || newCorrelationId("deadline");
      return closeDueRoundDeadlines(new Date(), correlationId);
    },
    {
      connection: createBullConnection(config),
      prefix: config.prefix,
      concurrency: 1,
    },
  );

  const reconciliationWorker = new Worker(
    QUEUE_NAMES.PAYMENT_RECONCILIATION,
    async (job: Job<{ correlationId?: string }>) => {
      const correlationId = job.data?.correlationId || newCorrelationId("recon");
      return reconcilePendingTransactions(new Date(), correlationId);
    },
    {
      connection: createBullConnection(config),
      prefix: config.prefix,
      concurrency: 1,
    },
  );

  workers.push(notificationWorker, deadlineWorker, reconciliationWorker);

  for (const worker of workers) {
    worker.on("failed", (job, err) => {
      log.error("bullmq job failed", {
        correlationId: (job?.data as { correlationId?: string } | undefined)?.correlationId,
        jobName: job?.name,
        jobId: job?.id,
        attempt: job ? (job.attemptsMade ?? 0) + 1 : undefined,
        error: err.message,
      });
    });
    worker.on("completed", (job) => {
      log.info("bullmq job completed", {
        correlationId: (job.data as { correlationId?: string } | undefined)?.correlationId,
        jobName: job.name,
        jobId: job.id,
      });
    });
  }

  async function start(): Promise<void> {
    if (started) return;
    started = true;
    log.info("worker runner starting", {
      prefix: config.prefix,
      maxAttempts: config.maxAttempts,
      backoffDelayMs: config.backoffDelayMs,
      provider: provider.name,
    });
    // Workers begin processing as soon as constructed; wait until ready.
    await Promise.all(workers.map((w) => w.waitUntilReady()));
    await Promise.all([
      queues.notification.waitUntilReady(),
      queues.roundDeadline.waitUntilReady(),
      queues.paymentReconciliation.waitUntilReady(),
    ]);
    log.info("worker runner ready", { metrics: getMetrics() });
  }

  async function stop(): Promise<void> {
    if (stopping) return;
    stopping = true;
    log.info("worker runner shutting down");
    // Close workers first (drain active jobs), then queues.
    await Promise.all(workers.map((w) => w.close()));
    await closeQueues(queues);
    log.info("worker runner stopped", { metrics: getMetrics() });
  }

  if (deps.installSignalHandlers !== false && process.env.NODE_ENV !== "test") {
    const onSignal = (signal: string) => {
      log.info("signal received", { signal });
      void stop().finally(() => {
        if (!config.quietShutdown) {
          process.exit(0);
        }
      });
    };
    process.once("SIGINT", () => onSignal("SIGINT"));
    process.once("SIGTERM", () => onSignal("SIGTERM"));
  }

  return { config, queues, workers, provider, start, stop };
}
