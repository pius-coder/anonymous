import { Queue } from "bullmq";

export const PAYMENT_RECONCILIATION_QUEUE = "session-jeu";
export const PAYMENT_RECONCILIATION_JOB = "payment.reconcile";

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
};

let queue: Queue | null = null;

export function getPaymentQueue() {
  queue ??= new Queue(PAYMENT_RECONCILIATION_QUEUE, { connection });
  return queue;
}

export function paymentReconciliationJobId(paymentId: string) {
  return `${PAYMENT_RECONCILIATION_JOB}:${paymentId}`;
}

export async function schedulePaymentReconciliation(input: {
  paymentId: string;
  delayMs?: number;
}) {
  await getPaymentQueue().add(
    PAYMENT_RECONCILIATION_JOB,
    { paymentId: input.paymentId },
    {
      delay: input.delayMs ?? 5 * 60 * 1000,
      jobId: paymentReconciliationJobId(input.paymentId),
      attempts: 3,
      backoff: { type: "exponential", delay: 30_000 },
    },
  );
}
