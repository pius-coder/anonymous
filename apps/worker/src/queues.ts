import { Queue, type JobsOptions } from "bullmq";
import { QUEUE_NAMES, type WorkerRuntimeConfig } from "./config.js";
import { createBullConnection } from "./redis.js";
import type { NotificationDeliveryPayload } from "./jobs/notificationDelivery.js";
import { newCorrelationId } from "./logging.js";

export type WorkerQueues = {
  notification: Queue;
  roundDeadline: Queue;
  paymentReconciliation: Queue;
};

export function defaultJobOptions(config: WorkerRuntimeConfig): JobsOptions {
  return {
    attempts: config.maxAttempts,
    backoff: {
      type: "exponential",
      delay: config.backoffDelayMs,
    },
    removeOnComplete: 200,
    removeOnFail: 500,
  };
}

export function createQueues(config: WorkerRuntimeConfig): WorkerQueues {
  const connection = createBullConnection(config);
  const defaults = defaultJobOptions(config);
  const prefix = config.prefix;

  return {
    notification: new Queue(QUEUE_NAMES.NOTIFICATION, {
      connection,
      prefix,
      defaultJobOptions: defaults,
    }),
    roundDeadline: new Queue(QUEUE_NAMES.ROUND_DEADLINE, {
      connection: createBullConnection(config),
      prefix,
      defaultJobOptions: defaults,
    }),
    paymentReconciliation: new Queue(QUEUE_NAMES.PAYMENT_RECONCILIATION, {
      connection: createBullConnection(config),
      prefix,
      defaultJobOptions: defaults,
    }),
  };
}

export async function closeQueues(queues: WorkerQueues): Promise<void> {
  await Promise.all([
    queues.notification.close(),
    queues.roundDeadline.close(),
    queues.paymentReconciliation.close(),
  ]);
}

/**
 * Enqueue a notification job with stable jobId so concurrent producers
 * cannot register the same NotificationJob twice in Redis.
 */
export async function enqueueNotificationDelivery(
  queue: Queue,
  notificationJobId: string,
  options?: { correlationId?: string; channel?: string },
): Promise<string> {
  const correlationId = options?.correlationId ?? newCorrelationId("notif");
  const payload: NotificationDeliveryPayload = {
    notificationJobId,
    correlationId,
    channel: options?.channel,
  };
  // BullMQ custom jobIds must not contain ':'.
  const job = await queue.add("deliver", payload, {
    jobId: `notif-${notificationJobId}`,
  });
  return job.id ?? `notif-${notificationJobId}`;
}

export async function enqueueRoundDeadlineScan(
  queue: Queue,
  correlationId = newCorrelationId("deadline"),
): Promise<string> {
  const job = await queue.add(
    "scan",
    { correlationId },
    {
      // Unique per tick; callers may pass jobId for single-flight tests.
      jobId: `deadline-scan-${correlationId}`,
    },
  );
  return job.id ?? correlationId;
}

export async function enqueuePaymentReconciliation(
  queue: Queue,
  correlationId = newCorrelationId("recon"),
): Promise<string> {
  const job = await queue.add(
    "reconcile",
    { correlationId },
    {
      jobId: `recon-${correlationId}`,
    },
  );
  return job.id ?? correlationId;
}
