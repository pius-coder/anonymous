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

export type ProviderStatusClient = {
  getPaymentStatus: (transId: string) => Promise<{
    transId: string;
    status: "CREATED" | "PENDING" | "SUCCESSFUL" | "FAILED" | "EXPIRED";
    amount?: number;
    externalId?: string;
    userId?: string;
  }>;
};

/**
 * Reconcile collection payments:
 * 1) If providerTransId present and credentials available — query payment-status (never invent SUCCESS).
 * 2) Else expire stale PENDING by age (24h) once.
 * Fapshi does not retry lost webhooks — this job is the recovery path.
 */
export async function reconcilePendingTransactions(
  now = new Date(),
  correlationId = "reconciliation",
  providerClient?: ProviderStatusClient,
): Promise<ReconciliationResult> {
  const result: ReconciliationResult = { processed: 0, skipped: 0, failed: 0, errors: [] };

  try {
    const pending = await paymentRepository.listAllTransactions({
      status: "PENDING",
      take: 100,
    });

    for (const listed of pending) {
      try {
        const transaction = await paymentRepository.findTransactionById(listed.id);
        if (!transaction) {
          result.skipped++;
          recordSkipped();
          continue;
        }
        if (transaction.status !== "PENDING" && transaction.status !== "CREATED") {
          result.skipped++;
          recordSkipped();
          continue;
        }

        // Provider status path (collection recovery)
        if (transaction.providerTransId && providerClient) {
          try {
            const remote = await providerClient.getPaymentStatus(transaction.providerTransId);
            if (
              remote.status === "SUCCESSFUL" ||
              remote.status === "FAILED" ||
              remote.status === "EXPIRED"
            ) {
              // Amount match for SUCCESS only
              if (
                remote.status === "SUCCESSFUL" &&
                typeof remote.amount === "number" &&
                remote.amount !== Number(transaction.amount)
              ) {
                result.skipped++;
                recordSkipped();
                log.info("reconciliation amount mismatch — no settle", {
                  correlationId,
                  jobName: "payment-reconciliation",
                  jobId: transaction.id,
                });
                continue;
              }

              const eventId = `fapshi:${remote.transId}:reconcile:${remote.status}:${transaction.id}`;
              const { inbox } = await paymentRepository.ingestProviderWebhook({
                provider: "fapshi",
                externalEventId: eventId,
                providerTransId: remote.transId,
                wireStatus: remote.status,
                paymentId: transaction.id,
                redactedSummary: `status=${remote.status}`,
                serviceKind: "COLLECTION",
              });

              await paymentRepository.applyWebhookSettlement({
                inboxId: inbox.id,
                transactionId: transaction.id,
                wireStatus: remote.status,
                providerTransId: remote.transId,
                admitOnSuccess: false,
              });
              result.processed++;
              recordSuccess();
              continue;
            }
            // Still pending at provider — leave alone
            result.skipped++;
            recordSkipped();
            continue;
          } catch (err) {
            // Do not fake success; fall through to age expiry only if very old
            log.error(
              `provider status failed for ${transaction.id}: ${err instanceof Error ? err.message : "err"}`,
              { correlationId, jobName: "payment-reconciliation" },
            );
          }
        }

        const age = now.getTime() - new Date(transaction.createdAt).getTime();
        if (age <= EXPIRY_MS) {
          result.skipped++;
          recordSkipped();
          continue;
        }

        const reference =
          transaction.reference && transaction.reference.endsWith("_EXPIRED")
            ? transaction.reference
            : transaction.reference
              ? `${transaction.reference}_EXPIRED`
              : `EXPIRED_${transaction.id}`;

        await paymentRepository.updateTransactionStatus(transaction.id, {
          status: "EXPIRED",
          reference,
          internalStatus: "EXPIRED",
          wireStatus: "EXPIRED",
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
