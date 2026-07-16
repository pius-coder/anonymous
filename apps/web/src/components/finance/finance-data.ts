import {
  formatXaf,
  mapPaymentStatusLabel,
  type PaymentDetail,
} from "@/services/payment/payment-api";

export type FinanceTransaction = {
  id: string;
  user: string;
  party: string;
  type: string;
  amount: string;
  status: "Réussi" | "Échoué" | "En attente" | string;
  date: string;
  providerStatus: string;
  ledgerStatus: string;
  reconciliation: "Rapprochée" | "À vérifier" | "Divergente";
  providerRef: string;
  idempotency: string;
  rawStatus?: string;
  rawAmount?: number;
};

/** Map a server PaymentDetail to finance UI row — never invents SUCCESS. */
export function mapPaymentToFinanceRow(payment: PaymentDetail): FinanceTransaction {
  const label = mapPaymentStatusLabel(payment.status);
  const reconciliation: FinanceTransaction["reconciliation"] =
    payment.status === "SUCCESSFUL"
      ? "Rapprochée"
      : payment.status === "PENDING"
        ? "À vérifier"
        : payment.status === "FAILED"
          ? "Divergente"
          : "À vérifier";

  return {
    id: payment.id,
    user: payment.walletId.slice(0, 8),
    party: payment.type,
    type: payment.type,
    amount: formatXaf(payment.amount),
    status: label,
    date: new Date(payment.createdAt).toLocaleString("fr-FR"),
    providerStatus: payment.provider ?? "—",
    ledgerStatus:
      payment.status === "SUCCESSFUL"
        ? "Mouvement comptabilisé ou accès payé"
        : payment.status === "PENDING"
          ? "En attente"
          : "Aucun mouvement",
    reconciliation,
    providerRef: payment.reference ? redactRef(payment.reference) : "—",
    idempotency: "—",
    rawStatus: payment.status,
    rawAmount: payment.amount,
  };
}

function redactRef(ref: string): string {
  if (ref.length <= 8) return ref;
  return `${ref.slice(0, 4)}••••${ref.slice(-4)}`;
}

/** Empty fallback — UI must load from API; no fabricated ledger. */
export const financeTransactions: FinanceTransaction[] = [];

export function getFinanceTransaction(transactionId: string): FinanceTransaction {
  return {
    id: transactionId,
    user: "—",
    party: "—",
    type: "—",
    amount: "—",
    status: "En attente",
    date: "—",
    providerStatus: "—",
    ledgerStatus: "Chargement serveur…",
    reconciliation: "À vérifier",
    providerRef: "—",
    idempotency: "—",
  };
}
