/**
 * REST payment/wallet/finance client.
 * Intentionally separate from apps/web/src/services/rpcServices.ts (ownership forbidden).
 * Connect PaymentService remains available via rpcClients once SEQ-03 mounts the transport.
 */
import { api } from "@/lib/api";

export type PaymentStatus =
  "CREATED" | "PENDING" | "SUCCESSFUL" | "FAILED" | "EXPIRED" | "REFUNDED";

export type PaymentDetail = {
  id: string;
  walletId: string | null;
  amount: number;
  type: string;
  provider: string | null;
  reference: string | null;
  status: PaymentStatus | string;
  checkoutUrl?: string;
  providerTransId?: string | null;
  providerExternalId?: string | null;
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

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  skip: number;
  take: number;
};

export type TransactionDetail = PaymentDetail & {
  walletId: string | null;
  internalStatus: string | null;
  wireStatus: string | null;
  checkoutUrl: string | null;
  expiresAt: string | null;
  settledAt: string | null;
  serviceKind: string | null;
  partyId: string | null;
  participationId: string | null;
  idempotencyKey: string | null;
};

export type WalletMetrics = {
  balance: number;
  ledgerCreditSum: number;
  ledgerDebitSum: number;
  mismatched: boolean;
  transactionCount: number;
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
    partyId?: string;
    participationId?: string;
    amount?: number;
    currency?: string;
    idempotencyKey?: string;
  }) {
    return api<PaymentDetail>("/v1/payments/initiate", {
      method: "POST",
      body: JSON.stringify({
        purpose: input.purpose ?? "ACCESS_FEE",
        productCode: input.productCode,
        partyId: input.partyId,
        participationId: input.participationId,
        amount: input.amount,
        currency: input.currency,
        idempotencyKey: input.idempotencyKey ?? newIdempotencyKey("init"),
      }),
    });
  },

  payWithWallet(input: {
    productCode?: string;
    partyId?: string;
    participationId?: string;
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
          partyId: input.partyId,
          participationId: input.participationId,
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

  getLedger(skip = 0, take = 50) {
    return api<PaginatedResult<LedgerEntryDetail>>(`/v1/wallet/ledger?skip=${skip}&take=${take}`);
  },

  getTransactions(skip = 0, take = 50) {
    return api<PaginatedResult<PaymentDetail>>(`/v1/wallet/transactions?skip=${skip}&take=${take}`);
  },

  getTransactionDetail(id: string) {
    return api<TransactionDetail>(`/v1/wallet/transactions/${encodeURIComponent(id)}`);
  },

  exportPlayerTransactions() {
    return api<PaymentDetail[]>("/v1/wallet/export");
  },

  getWalletMetrics() {
    return api<WalletMetrics>("/v1/wallet/metrics");
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

  expire(paymentId: string, reason: string, idempotencyKey: string, stepUp: string) {
    return api<PaymentDetail>(`/v1/admin/payments/${encodeURIComponent(paymentId)}/expire`, {
      method: "POST",
      headers: { "X-Finance-Step-Up": stepUp },
      body: JSON.stringify({ reason, idempotencyKey }),
    });
  },

  requestCompensation(
    paymentId: string,
    body: {
      reason: string;
      amount?: number;
      beneficiaryPhone?: string;
      beneficiaryEmail?: string;
      beneficiaryVerified: boolean;
      idempotencyKey: string;
    },
    stepUp: string,
  ) {
    return api<{ reconciliationId: string; decision: string }>(
      `/v1/admin/payments/${encodeURIComponent(paymentId)}/compensation`,
      {
        method: "POST",
        headers: { "X-Finance-Step-Up": stepUp },
        body: JSON.stringify(body),
      },
    );
  },

  decideCompensation(
    reconciliationId: string,
    body: {
      decision: "APPROVED_PAYOUT" | "APPROVED_MANUAL" | "REJECTED" | "OUT_OF_SCOPE";
      reason: string;
      idempotencyKey: string;
    },
    stepUp: string,
  ) {
    return api<{ reconciliationId: string; decision: string; outcome: string }>(
      `/v1/admin/compensations/${encodeURIComponent(reconciliationId)}/decide`,
      {
        method: "POST",
        headers: { "X-Finance-Step-Up": stepUp },
        body: JSON.stringify(body),
      },
    );
  },

  listMismatches(params?: { skip?: number; take?: number }) {
    const q = new URLSearchParams();
    if (params?.skip !== undefined) q.set("skip", String(params.skip));
    if (params?.take !== undefined) q.set("take", String(params.take));
    const qs = q.toString();
    return api<{
      mismatches: Array<{
        id: string;
        paymentId: string;
        status: string;
        notes: string | null;
        createdAt: string;
      }>;
    }>(`/v1/admin/mismatches${qs ? `?${qs}` : ""}`);
  },

  dailyReport() {
    return api<{
      day: string;
      collectionSuccessfulCount: number;
      collectionPendingCount: number;
      collectionFailedCount: number;
      payoutCount: number;
      mismatchCount: number;
      ledgerCredits: number;
      ledgerDebits: number;
      walletBalanceSum: number;
      paidParticipations: number;
      serviceBalanceNote: string;
    }>("/v1/admin/report/daily");
  },

  listWallets(params?: { skip?: number; take?: number }) {
    const q = new URLSearchParams();
    if (params?.skip !== undefined) q.set("skip", String(params.skip));
    if (params?.take !== undefined) q.set("take", String(params.take));
    const qs = q.toString();
    return api<{
      wallets: Array<{
        id: string;
        userId: string;
        balance: number;
        currency: string;
        isFrozen: boolean;
        version: number;
        updatedAt: string;
      }>;
    }>(`/v1/admin/wallets${qs ? `?${qs}` : ""}`);
  },

  exportTransactions() {
    return api<{
      exportedAt: string;
      report: unknown;
      transactions: PaymentDetail[];
      total: number;
      status: string;
    }>("/v1/admin/export/transactions");
  },
};

/** Map server status to UI labels without inventing intermediate states. */
export function mapPaymentStatusLabel(status: string): string {
  switch (status) {
    case "CREATED":
      return "Créé";
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
