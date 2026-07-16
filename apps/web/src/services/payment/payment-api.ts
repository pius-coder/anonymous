/**
 * REST payment/wallet/finance client.
 * Intentionally separate from apps/web/src/services/rpcServices.ts (ownership forbidden).
 * Connect PaymentService remains available via rpcClients once SEQ-03 mounts the transport.
 */
import { api } from "@/lib/api";

export type PaymentStatus =
  | "PENDING"
  | "SUCCESSFUL"
  | "FAILED"
  | "EXPIRED"
  | "REFUNDED";

export type PaymentDetail = {
  id: string;
  walletId: string;
  amount: number;
  type: string;
  provider: string | null;
  reference: string | null;
  status: PaymentStatus | string;
  checkoutUrl?: string;
  createdAt: string;
};

export type WalletDetail = {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  createdAt: string;
};

export type LedgerEntryDetail = {
  id: string;
  transactionId: string;
  debit: number;
  credit: number;
  balance: number;
  reason: string;
  createdAt: string;
};

export type AdminPaymentList = {
  transactions: PaymentDetail[];
  total: number;
};

function newIdempotencyKey(prefix: string): string {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${id}`;
}

export const paymentApi = {
  newIdempotencyKey,

  initiate(input: {
    purpose?: "ACCESS_FEE" | "TOP_UP";
    productCode?: string;
    amount?: number;
    currency?: string;
    idempotencyKey?: string;
  }) {
    return api<PaymentDetail>("/v1/payments/initiate", {
      method: "POST",
      body: JSON.stringify({
        purpose: input.purpose ?? "ACCESS_FEE",
        productCode: input.productCode,
        amount: input.amount,
        currency: input.currency,
        idempotencyKey: input.idempotencyKey ?? newIdempotencyKey("init"),
      }),
    });
  },

  payWithWallet(input: {
    productCode?: string;
    reason: string;
    idempotencyKey?: string;
  }) {
    return api<{ payment: PaymentDetail; ledger: LedgerEntryDetail; amount: number }>(
      "/v1/payments/wallet/pay",
      {
        method: "POST",
        body: JSON.stringify({
          purpose: "ACCESS_FEE",
          productCode: input.productCode,
          reason: input.reason,
          idempotencyKey: input.idempotencyKey ?? newIdempotencyKey("wallet"),
        }),
      },
    );
  },

  getStatus(paymentId: string) {
    return api<PaymentDetail>(`/v1/payments/${encodeURIComponent(paymentId)}/status`);
  },

  getWallet() {
    return api<WalletDetail>("/v1/wallet");
  },

  getLedger() {
    return api<LedgerEntryDetail[]>("/v1/wallet/ledger");
  },

  listAdminPayments(params?: { skip?: number; take?: number; status?: string }) {
    const q = new URLSearchParams();
    if (params?.skip !== undefined) q.set("skip", String(params.skip));
    if (params?.take !== undefined) q.set("take", String(params.take));
    if (params?.status) q.set("status", params.status);
    const qs = q.toString();
    return api<AdminPaymentList>(`/v1/admin/payments${qs ? `?${qs}` : ""}`);
  },

  getAdminPayment(paymentId: string) {
    return api<PaymentDetail>(`/v1/admin/payments/${encodeURIComponent(paymentId)}`);
  },

  reconcile(paymentId: string, reason?: string) {
    return api<PaymentDetail>(`/v1/admin/payments/${encodeURIComponent(paymentId)}/reconcile`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },
};

/** Map server status to UI labels without inventing intermediate states. */
export function mapPaymentStatusLabel(status: string): string {
  switch (status) {
    case "PENDING":
      return "En attente";
    case "SUCCESSFUL":
      return "Réussi";
    case "FAILED":
      return "Échoué";
    case "EXPIRED":
      return "Expiré";
    case "REFUNDED":
      return "Remboursé";
    default:
      return status;
  }
}

export function formatXaf(amount: number): string {
  return `${amount.toLocaleString("fr-FR")} FCFA`;
}
