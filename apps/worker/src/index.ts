export type { ReconciliationResult } from "./jobs/paymentReconciliation.js";
export { reconcilePendingTransactions } from "./jobs/paymentReconciliation.js";
export type { RoundDeadlineCloseResult } from "./jobs/roundDeadline.js";
export { closeDueRoundDeadlines } from "./jobs/roundDeadline.js";
export {
  deliverNotificationJob,
  RetryableDeliveryError,
  TerminalDeliveryError,
  type NotificationDeliveryPayload,
  type NotificationDeliveryResult,
} from "./jobs/notificationDelivery.js";
export { loadWorkerConfig, QUEUE_NAMES, type WorkerRuntimeConfig } from "./config.js";
export { createWorkerRunner, type WorkerRunner, type RunnerDeps } from "./runner.js";
export {
  createQueues,
  closeQueues,
  enqueueNotificationDelivery,
  enqueueRoundDeadlineScan,
  enqueuePaymentReconciliation,
  type WorkerQueues,
} from "./queues.js";
export { getMetrics, resetMetrics, type MetricSnapshot } from "./metrics.js";
export { log, newCorrelationId } from "./logging.js";

export type WorkerFoundation = {
  service: "worker";
  foundation: "v0.1";
  jobs: "payment-reconciliation,round-deadline-close,notification-delivery";
  runner: "bullmq";
};

export type WorkerJobType =
  | "PAYMENT_RECONCILIATION"
  | "ROUND_DEADLINE_CLOSE"
  | "NOTIFICATION_DELIVERY";

export function getWorkerFoundation(): WorkerFoundation {
  return {
    service: "worker",
    foundation: "v0.1",
    jobs: "payment-reconciliation,round-deadline-close,notification-delivery",
    runner: "bullmq",
  };
}

const shouldBoot =
  process.env.NODE_ENV !== "test" && process.env.WORKER_AUTOSTART !== "0";

if (shouldBoot) {
  const { createWorkerRunner } = await import("./runner.js");
  const runner = createWorkerRunner();
  await runner.start();
  console.log(
    JSON.stringify({
      service: "worker",
      status: "ready",
      jobs: getWorkerFoundation().jobs,
      provider: runner.provider.name,
    }),
  );
}
