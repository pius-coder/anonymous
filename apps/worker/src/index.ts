export type { ReconciliationResult } from "./jobs/paymentReconciliation.js";
export { reconcilePendingTransactions } from "./jobs/paymentReconciliation.js";
export type { RoundDeadlineCloseResult } from "./jobs/roundDeadline.js";
export { closeDueRoundDeadlines } from "./jobs/roundDeadline.js";

export type WorkerFoundation = {
  service: "worker";
  foundation: "v0.1";
  jobs: "payment-reconciliation,round-deadline-close";
};

export type WorkerJobType = "PAYMENT_RECONCILIATION" | "ROUND_DEADLINE_CLOSE";

export function getWorkerFoundation(): WorkerFoundation {
  return {
      service: "worker",
      foundation: "v0.1",
      jobs: "payment-reconciliation,round-deadline-close",
    };
  }

if (process.env.NODE_ENV !== "test") {
  console.log("Worker foundation ready. Jobs: payment-reconciliation, round-deadline-close.");
}
