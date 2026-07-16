import { paymentRepository } from "@session-jeu/db";
import { log } from "../logging.js";
import { recordFailure, recordSkipped, recordSuccess } from "../metrics.js";

export type ReconciliationResult = {
  processed: number;
  skipped: number;
  failed: number;
  errors: string[];
};

const EXPIRY_MS = 24 * 60 * 60 * 1000;

/**
 * Expire stale PENDING payment transactions.
 * Idempotent: re-fetches each row and only transitions PENDING → EXPIRED once.
 * Never starts a party or mutates competitive state.
 */
export async function reconcilePendingTransactions(
  now = new Date(),
  correlationId = "reconciliation",
): Promise<ReconciliationResult> {
  const result: ReconciliationResult = { processed: 0, skipped: 0, failed: 0, errors: [] };

  try {
    const pending = await paymentRepository.listAllTransactions({
      status: "PENDING",
      take: 100,
    });

    for (const listed of pending) {
      try {
        // Re-fetch for concurrent safety (another worker may have expired it).
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
        if (age <= EXPIRY_MS) {
          result.skipped++;
          recordSkipped();
          continue;
        }

        // Stable reference: do not re-append if already marked.
        const reference =
          transaction.reference && transaction.reference.endsWith("_EXPIRED")
            ? transaction.reference
            : transaction.reference
              ? `${transaction.reference}_EXPIRED`
              : `EXPIRED_${transaction.id}`;

        await paymentRepository.updateTransactionStatus(transaction.id, {
          status: "EXPIRED",
          reference,
        });
        result.processed++;
        recordSuccess();
        log.info("payment transaction expired", {
          correlationId,
          jobName: "payment-reconciliation",
          jobId: transaction.id,
        });
      } catch (err) {
        result.failed++;
        recordFailure();
        const msg = `Transaction ${listed.id}: ${err instanceof Error ? err.message : "unknown error"}`;
        result.errors.push(msg);
        log.error(msg, { correlationId, jobName: "payment-reconciliation" });
      }
    }
  } catch (err) {
    const msg = `Reconciliation error: ${err instanceof Error ? err.message : "unknown error"}`;
    result.errors.push(msg);
    recordFailure();
    log.error(msg, { correlationId, jobName: "payment-reconciliation" });
  }

  return result;
}
