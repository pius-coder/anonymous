import { paymentRepository } from "@session-jeu/db";
import {
  expireCollectionPayment,
  getCollectionPaymentStatus,
  wireStatusToEnum,
} from "@session-jeu/shared";
import { log } from "../logging.js";
import { recordFailure, recordSkipped, recordSuccess } from "../metrics.js";

export type ReconciliationResult = {
  processed: number;
  skipped: number;
  failed: number;
  mismatches: number;
  expired: number;
  errors: string[];
  dlq: string[];
};

const PAGE_SIZE = 50;
const MAX_PAGES = 20;
const EXPIRY_MS = 24 * 60 * 60 * 1000;

/**
 * Periodic payment reconciliation:
 * - paginate PENDING collection txs
 * - expire local/provider overdue checkouts
 * - poll official payment-status when transId known
 * - record MATCHED / MISMATCH; hard failures go to DLQ list (caller may enqueue)
 * Never invents SUCCESSFUL without official SUCCESSFUL + amount match.
 * Never starts a party or mutates competitive state.
 */
export async function reconcilePendingTransactions(
  now = new Date(),
  correlationId = "reconciliation",
): Promise<ReconciliationResult> {
  const result: ReconciliationResult = {
    processed: 0,
    skipped: 0,
    failed: 0,
    mismatches: 0,
    expired: 0,
    errors: [],
    dlq: [],
  };

  try {
    // Bulk expire by expiresAt when set (idempotent updateMany).
    try {
      const bulk = await paymentRepository.expireDueCheckouts(now);
      result.expired += bulk;
      if (bulk > 0) {
        log.info("bulk expireDueCheckouts", {
          correlationId,
          jobName: "payment-reconciliation",
          jobId: String(bulk),
        });
      }
    } catch (err) {
      const msg = `expireDueCheckouts: ${err instanceof Error ? err.message : "unknown"}`;
      result.errors.push(msg);
      log.error(msg, { correlationId, jobName: "payment-reconciliation" });
    }

    for (let page = 0; page < MAX_PAGES; page++) {
      const pending = await paymentRepository.listPendingForReconciliation({
        skip: page * PAGE_SIZE,
        take: PAGE_SIZE,
        serviceKind: "COLLECTION" as never,
      });
      if (pending.length === 0) break;

      for (const listed of pending) {
        try {
          const transaction = await paymentRepository.findTransactionById(listed.id);
          if (!transaction) {
            result.skipped++;
            recordSkipped();
            continue;
          }
          if (transaction.status !== "PENDING") {
            result.skipped++;
            recordSkipped();
            continue;
          }

          const age = now.getTime() - new Date(transaction.createdAt).getTime();
          const pastExpires =
            transaction.expiresAt != null && new Date(transaction.expiresAt).getTime() <= now.getTime();

          if (age > EXPIRY_MS || pastExpires) {
            // Only call Fapshi expire-pay with a real provider transId (never invented refs).
            const transId = transaction.providerTransId;
            if (transId && !String(transId).startsWith("fapshi-local")) {
              try {
                const remote = await expireCollectionPayment(transId);
                if ("outcome" in remote && remote.outcome === "AMBIGUOUS") {
                  await paymentRepository.createReconciliation({
                    paymentId: transaction.id,
                    status: "MISMATCH",
                    notes: "expire_ambiguous_worker",
                  });
                  result.mismatches++;
                  result.dlq.push(transaction.id);
                  recordFailure();
                  continue;
                }
              } catch {
                // Local expire still applies; mismatch if provider unreachable after overdue
                await paymentRepository.createReconciliation({
                  paymentId: transaction.id,
                  status: "MISMATCH",
                  notes: "expire_provider_unreachable",
                });
                result.mismatches++;
              }
            }

            const reference =
              transaction.reference && transaction.reference.endsWith("_EXPIRED")
                ? transaction.reference
                : transaction.reference
                  ? `${transaction.reference}_EXPIRED`
                  : `EXPIRED_${transaction.id}`;

            await paymentRepository.updateTransactionStatus(transaction.id, {
              status: "EXPIRED",
              internalStatus: "EXPIRED" as never,
              wireStatus: "EXPIRED" as never,
              reference,
            });
            result.processed++;
            result.expired++;
            recordSuccess();
            log.info("payment transaction expired", {
              correlationId,
              jobName: "payment-reconciliation",
              jobId: transaction.id,
            });
            continue;
          }

          // Provider status poll when we have a real transId
          const transId = transaction.providerTransId;
          if (!transId || String(transId).startsWith("fapshi-local")) {
            result.skipped++;
            recordSkipped();
            continue;
          }

          let remote;
          try {
            remote = await getCollectionPaymentStatus(transId);
          } catch (err) {
            result.failed++;
            recordFailure();
            const msg = `status ${transaction.id}: ${err instanceof Error ? err.message : "unknown"}`;
            result.errors.push(msg);
            result.dlq.push(transaction.id);
            await paymentRepository.createReconciliation({
              paymentId: transaction.id,
              status: "MISMATCH",
              notes: "status_poll_failed",
            });
            result.mismatches++;
            continue;
          }

          if (remote.status === "UNKNOWN") {
            await paymentRepository.createReconciliation({
              paymentId: transaction.id,
              status: "MISMATCH",
              notes: "wire_unknown",
            });
            result.mismatches++;
            result.dlq.push(transaction.id);
            recordFailure();
            continue;
          }

          const amountOk =
            remote.amount === undefined || remote.amount === Number(transaction.amount);

          if (remote.status === "SUCCESSFUL") {
            // Never auto-credit or invent settlement without inbox apply path.
            // Flag for finance operator / settlement pipeline.
            await paymentRepository.updateTransactionStatus(transaction.id, {
              status: "PENDING",
              internalStatus: "RECONCILING" as never,
              wireStatus: wireStatusToEnum(remote.status) as never,
            });
            await paymentRepository.createReconciliation({
              paymentId: transaction.id,
              status: amountOk ? "MISMATCH" : "MISMATCH",
              notes: amountOk
                ? "provider_successful_awaiting_settlement"
                : `amount_mismatch:local=${transaction.amount};wire=${remote.amount}`,
            });
            result.mismatches++;
            result.processed++;
            recordSuccess();
            log.info("provider SUCCESSFUL needs settlement", {
              correlationId,
              jobName: "payment-reconciliation",
              jobId: transaction.id,
            });
            continue;
          }

          if (remote.status === "FAILED" || remote.status === "EXPIRED") {
            await paymentRepository.updateTransactionStatus(transaction.id, {
              status: remote.status,
              internalStatus: remote.status as never,
              wireStatus: remote.status as never,
            });
            await paymentRepository.createReconciliation({
              paymentId: transaction.id,
              status: "MATCHED",
              notes: `synced_${remote.status.toLowerCase()}`,
            });
            result.processed++;
            recordSuccess();
            continue;
          }

          // PENDING/CREATED on both sides — matched waiting
          result.skipped++;
          recordSkipped();
        } catch (err) {
          result.failed++;
          recordFailure();
          const msg = `Transaction ${listed.id}: ${err instanceof Error ? err.message : "unknown error"}`;
          result.errors.push(msg);
          result.dlq.push(listed.id);
          log.error(msg, { correlationId, jobName: "payment-reconciliation" });
        }
      }

      if (pending.length < PAGE_SIZE) break;
    }
  } catch (err) {
    const msg = `Reconciliation error: ${err instanceof Error ? err.message : "unknown error"}`;
    result.errors.push(msg);
    recordFailure();
    log.error(msg, { correlationId, jobName: "payment-reconciliation" });
  }

  if (result.mismatches > 0 || result.dlq.length > 0) {
    log.error("payment reconciliation mismatches", {
      correlationId,
      jobName: "payment-reconciliation",
      jobId: `mismatches=${result.mismatches};dlq=${result.dlq.length}`,
    });
  }

  return result;
}
