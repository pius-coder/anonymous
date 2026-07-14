export type { ReconciliationResult } from "./jobs/paymentReconciliation.js";
export { reconcilePendingTransactions } from "./jobs/paymentReconciliation.js";

export type WorkerFoundation = {
  service: "worker";
  foundation: "v0.1";
  jobs: "payment-reconciliation";
};

export type WorkerJobType = "PAYMENT_RECONCILIATION";

export function getWorkerFoundation(): WorkerFoundation {
  return {
    service: "worker",
    foundation: "v0.1",
    jobs: "payment-reconciliation",
  };
}

if (process.env.NODE_ENV !== "test") {
  console.log("Worker foundation ready. Jobs: payment-reconciliation.");
}

