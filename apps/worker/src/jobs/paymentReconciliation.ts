import { paymentRepository } from "@session-jeu/db";

export type ReconciliationResult = {
  processed: number;
  failed: number;
  errors: string[];
};

export async function reconcilePendingTransactions(): Promise<ReconciliationResult> {
  const result: ReconciliationResult = { processed: 0, failed: 0, errors: [] };

  try {
    const pending = await paymentRepository.listAllTransactions({
      status: "PENDING",
      take: 100,
    });

    for (const transaction of pending) {
      try {
        const age = Date.now() - new Date(transaction.createdAt).getTime();
        const expiryMs = 24 * 60 * 60 * 1000;

        if (age > expiryMs) {
          await paymentRepository.updateTransactionStatus(transaction.id, {
            status: "EXPIRED",
            reference: transaction.reference ? `${transaction.reference}_EXPIRED` : `EXPIRED_${transaction.id}`,
          });
          result.processed++;
        }
      } catch (err) {
        result.failed++;
        result.errors.push(`Transaction ${transaction.id}: ${err instanceof Error ? err.message : "unknown error"}`);
      }
    }
  } catch (err) {
    result.errors.push(`Reconciliation error: ${err instanceof Error ? err.message : "unknown error"}`);
  }

  return result;
}
