import { paymentRepository, auditRepository } from "@session-jeu/db";
import { PAYMENT_ERRORS } from "@session-jeu/shared";
import {
  resolveServerAmount,
  type PaymentPurpose,
} from "../../payments/server-amount.js";
import {
  initiateExternalCheckout,
  verifyWebhookSignature,
} from "../../payments/provider-adapter.js";

export class PaymentUseCaseError extends Error {
  readonly code: string;
  readonly httpStatus: number;

  constructor(code: string, message: string, httpStatus: number) {
    super(message);
    this.name = "PaymentUseCaseError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

function mapAmountError(err: unknown): never {
  if (err instanceof Error && err.message === "INVALID_AMOUNT") {
    throw new PaymentUseCaseError(
      PAYMENT_ERRORS.INVALID_AMOUNT.code,
      PAYMENT_ERRORS.INVALID_AMOUNT.message,
      PAYMENT_ERRORS.INVALID_AMOUNT.status,
    );
  }
  if (err instanceof Error && err.message === "INVALID_SERVER_AMOUNT") {
    throw new PaymentUseCaseError(
      PAYMENT_ERRORS.INVALID_AMOUNT.code,
      "Montant serveur invalide",
      500,
    );
  }
  throw err;
}

export type InitiatePaymentInput = {
  userId: string;
  /** ACCESS_FEE (default) uses server catalog; TOP_UP uses validated requestedAmount. */
  purpose?: PaymentPurpose;
  productCode?: string;
  currency?: string;
  /** Required idempotency key — server never invents client intent keys. */
  idempotencyKey: string;
  /** Only consumed for TOP_UP; ignored for ACCESS_FEE. */
  requestedAmount?: number;
  /** When set with participationId, creates collection checkout linked to admission. */
  partyId?: string;
  participationId?: string;
};

export type PaymentDetail = {
  id: string;
  /** Nullable after production model (provider checkout may omit wallet until settled). */
  walletId: string | null;
  amount: number;
  type: string;
  provider: string | null;
  reference: string | null;
  status: string;
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

export type WebhookPayload = {
  transactionId: string;
  status: string;
  providerReference: string;
  signature: string;
  /** Optional provider event id for inbox idempotency. */
  externalEventId?: string;
  providerTransId?: string;
};

type WithNumeric = { toNumber(): number };

function toPaymentDetail(
  t: {
    id: string;
    walletId: string | null;
    amount: number | WithNumeric;
    type: string;
    provider: string | null;
    reference: string | null;
    status: string;
    createdAt: Date;
    checkoutUrl?: string | null;
  },
  checkoutUrl?: string,
): PaymentDetail {
  const resolvedCheckout = checkoutUrl ?? t.checkoutUrl ?? undefined;
  return {
    id: t.id,
    walletId: t.walletId,
    amount: Number(t.amount),
    type: t.type,
    provider: t.provider,
    reference: t.reference,
    status: String(t.status),
    ...(resolvedCheckout ? { checkoutUrl: resolvedCheckout } : {}),
    createdAt: t.createdAt.toISOString(),
  };
}

function toWalletDetail(w: {
  id: string;
  userId: string;
  balance: number | WithNumeric;
  currency: string;
  createdAt: Date;
}): WalletDetail {
  return {
    id: w.id,
    userId: w.userId,
    balance: Number(w.balance),
    currency: w.currency,
    createdAt: w.createdAt.toISOString(),
  };
}

function toLedgerEntryDetail(e: {
  id: string;
  transactionId: string;
  debit: number | WithNumeric;
  credit: number | WithNumeric;
  balance: number | WithNumeric;
  reason: string;
  createdAt: Date;
}): LedgerEntryDetail {
  return {
    id: e.id,
    transactionId: e.transactionId,
    debit: Number(e.debit),
    credit: Number(e.credit),
    balance: Number(e.balance),
    reason: e.reason,
    createdAt: e.createdAt.toISOString(),
  };
}

function requireIdempotencyKey(key: string | undefined): string {
  if (!key || key.trim().length < 8) {
    throw new PaymentUseCaseError(
      "INVALID_ARGUMENT",
      "Clé d'idempotence requise (min. 8 caractères)",
      400,
    );
  }
  return key.trim();
}

/** Gains remain invisible/non-credited until explicit score publication (out of scope). */
export function assertPrizeCreditAllowed(_opts?: { published?: boolean }): void {
  throw new PaymentUseCaseError(
    "FAILED_PRECONDITION",
    "Les gains restent invisibles et non crédités avant publication explicite des scores",
    403,
  );
}

export async function getOrCreateWallet(userId: string): Promise<WalletDetail> {
  const existing = await paymentRepository.findWalletByUserId(userId);
  if (existing) {
    return toWalletDetail(existing);
  }
  const created = await paymentRepository.createWallet({ userId });
  return toWalletDetail(created);
}

/**
 * Initiate external payment. Amount is always server-resolved.
 * Idempotent on idempotencyKey.
 * When partyId+participationId are provided, links collection checkout to participation (PAYMENT_PENDING).
 */
export async function initiatePayment(input: InitiatePaymentInput): Promise<PaymentDetail> {
  const idempotencyKey = requireIdempotencyKey(input.idempotencyKey);
  const purpose: PaymentPurpose = input.purpose ?? "ACCESS_FEE";

  let amount: number;
  try {
    amount = resolveServerAmount({
      purpose,
      productCode: input.productCode,
      requestedAmount: input.requestedAmount,
    });
  } catch (err) {
    mapAmountError(err);
  }

  const wallet = await getOrCreateWallet(input.userId);

  const existing = await paymentRepository.findTransactionByIdempotencyKey(idempotencyKey);
  if (existing) {
    return toPaymentDetail(
      existing,
      existing.checkoutUrl ??
        (existing.reference ? `/payments/checkout/${existing.id}` : undefined),
    );
  }

  const type = purpose === "TOP_UP" ? "TOP_UP" : "ACCESS_FEE";
  const admissionCheckout =
    purpose === "ACCESS_FEE" && !!input.partyId && !!input.participationId;

  let transaction;
  try {
    if (admissionCheckout) {
      const externalId = `ext-${idempotencyKey}`.slice(0, 100);
      transaction = await paymentRepository.createCheckoutPayment({
        amount,
        currency: input.currency ?? wallet.currency,
        userId: input.userId,
        partyId: input.partyId!,
        participationId: input.participationId!,
        walletId: wallet.id,
        providerExternalId: externalId,
        idempotencyKey,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
    } else {
      transaction = await paymentRepository.createPaymentTransaction({
        walletId: wallet.id,
        userId: input.userId,
        amount,
        type,
        provider: "FAPSHI",
        idempotencyKey,
        status: "PENDING",
      });
    }
  } catch (err) {
    const raced = await paymentRepository.findTransactionByIdempotencyKey(idempotencyKey);
    if (raced) return toPaymentDetail(raced);
    throw err;
  }

  try {
    const external = await initiateExternalCheckout({
      transactionId: transaction.id,
      amount,
      currency: input.currency ?? wallet.currency,
      userId: input.userId,
      idempotencyKey,
    });
    const updated = await paymentRepository.updateTransactionStatus(transaction.id, {
      status: "PENDING",
      provider: external.provider,
      reference: external.providerReference,
    });
    // Persist checkout URL when repository supports it via raw update if needed
    return toPaymentDetail(updated, external.checkoutUrl);
  } catch (err) {
    if (err instanceof Error && err.message === "PROVIDER_ERROR") {
      await paymentRepository.updateTransactionStatus(transaction.id, { status: "FAILED" });
      throw new PaymentUseCaseError(
        PAYMENT_ERRORS.PROVIDER_ERROR.code,
        PAYMENT_ERRORS.PROVIDER_ERROR.message,
        PAYMENT_ERRORS.PROVIDER_ERROR.status,
      );
    }
    if (err instanceof Error && err.message === "PROVIDER_NOT_CONFIGURED") {
      await paymentRepository.updateTransactionStatus(transaction.id, { status: "FAILED" });
      throw new PaymentUseCaseError(
        PAYMENT_ERRORS.PROVIDER_ERROR.code,
        "Fournisseur de collecte non configuré",
        502,
      );
    }
    throw err;
  }
}

/**
 * Webhook handler. Durable inbox + applyWebhookSettlement (idempotent).
 * Never credits PRIZE. ACCESS_FEE / ENTRY_FEE success → paymentState PAID atomically.
 * TOP_UP may credit wallet once via legacy settle path when no participation link.
 */
export async function handlePaymentWebhook(payload: WebhookPayload): Promise<PaymentDetail> {
  const secret = process.env.FAPSHI_WEBHOOK_SECRET;
  if (!verifyWebhookSignature(payload.signature, secret)) {
    throw new PaymentUseCaseError(
      PAYMENT_ERRORS.WEBHOOK_SIGNATURE_INVALID.code,
      PAYMENT_ERRORS.WEBHOOK_SIGNATURE_INVALID.message,
      PAYMENT_ERRORS.WEBHOOK_SIGNATURE_INVALID.status,
    );
  }

  const transaction = await paymentRepository.findTransactionById(payload.transactionId);
  if (!transaction) {
    throw new PaymentUseCaseError(
      PAYMENT_ERRORS.PAYMENT_NOT_FOUND.code,
      PAYMENT_ERRORS.PAYMENT_NOT_FOUND.message,
      PAYMENT_ERRORS.PAYMENT_NOT_FOUND.status,
    );
  }

  if (transaction.type === "PRIZE") {
    assertPrizeCreditAllowed();
  }

  if (
    transaction.status === "SUCCESSFUL" ||
    transaction.status === "FAILED" ||
    transaction.status === "EXPIRED"
  ) {
    return toPaymentDetail(transaction);
  }

  const wireStatus =
    payload.status === "SUCCESS" || payload.status === "SUCCESSFUL"
      ? "SUCCESSFUL"
      : payload.status === "FAILED"
        ? "FAILED"
        : payload.status === "EXPIRED"
          ? "EXPIRED"
          : "PENDING";

  const externalEventId =
    payload.externalEventId ??
    `${payload.providerReference}:${wireStatus}:${payload.transactionId}`;

  const { inbox, duplicate } = await paymentRepository.ingestProviderWebhook({
    provider: "fapshi",
    externalEventId,
    providerTransId: payload.providerTransId ?? payload.providerReference,
    wireStatus: wireStatus as never,
    paymentId: transaction.id,
    redactedSummary: `status=${wireStatus}`,
    serviceKind: (transaction.serviceKind ?? "COLLECTION") as never,
  });

  if (duplicate && inbox.inboxStatus === "APPLIED") {
    const current = await paymentRepository.findTransactionById(transaction.id);
    return toPaymentDetail(current ?? transaction);
  }

  // Admission / terminal wire: applyWebhookSettlement → PAID on success (not auto-ADMITTED).
  // TOP_UP credit: settlePaymentWebhook credits wallet once when no participation link.
  const isTopUpCredit =
    (transaction.type === "TOP_UP" || transaction.type === "WALLET_CREDIT") &&
    !transaction.participationId &&
    wireStatus === "SUCCESSFUL";

  if (isTopUpCredit) {
    const updated = await paymentRepository.settlePaymentWebhook({
      transactionId: payload.transactionId,
      status: "SUCCESSFUL",
      providerReference: payload.providerReference,
    });
    if (!updated) {
      throw new PaymentUseCaseError(
        PAYMENT_ERRORS.PAYMENT_NOT_FOUND.code,
        PAYMENT_ERRORS.PAYMENT_NOT_FOUND.message,
        PAYMENT_ERRORS.PAYMENT_NOT_FOUND.status,
      );
    }
    // Mark inbox applied best-effort via settlement path already handled for admission;
    // top-up uses legacy settle — still record provider ref on payment.
    return toPaymentDetail(updated);
  }

  const applied = await paymentRepository.applyWebhookSettlement({
    inboxId: inbox.id,
    transactionId: transaction.id,
    wireStatus: wireStatus as never,
    providerTransId: payload.providerTransId ?? payload.providerReference,
    admitOnSuccess: false,
  });
  return toPaymentDetail(applied.payment);
}

/**
 * Debit wallet for access (or other non-prize reason) with server amount when purpose is ACCESS_FEE.
 */
export async function payWithWallet(input: {
  userId: string;
  purpose?: PaymentPurpose;
  productCode?: string;
  reason: string;
  idempotencyKey: string;
  requestedAmount?: number;
  partyId?: string;
  participationId?: string;
}): Promise<{ payment: PaymentDetail; ledger: LedgerEntryDetail; amount: number }> {
  const idempotencyKey = requireIdempotencyKey(input.idempotencyKey);
  const purpose: PaymentPurpose = input.purpose ?? "ACCESS_FEE";

  let amount: number;
  try {
    amount = resolveServerAmount({
      purpose,
      productCode: input.productCode,
      requestedAmount: input.requestedAmount,
    });
  } catch (err) {
    mapAmountError(err);
  }

  if (purpose === "TOP_UP") {
    throw new PaymentUseCaseError(
      "INVALID_ARGUMENT",
      "Le rechargement ne peut pas débiter le wallet",
      400,
    );
  }

  const wallet = await paymentRepository.findWalletByUserId(input.userId);
  if (!wallet) {
    throw new PaymentUseCaseError(
      PAYMENT_ERRORS.WALLET_NOT_FOUND.code,
      PAYMENT_ERRORS.WALLET_NOT_FOUND.message,
      PAYMENT_ERRORS.WALLET_NOT_FOUND.status,
    );
  }

  try {
    const result = await paymentRepository.createWalletDebitPayment({
      walletId: wallet.id,
      amount,
      reason: input.reason,
      idempotencyKey,
      partyId: input.partyId,
      participationId: input.participationId,
      userId: input.userId,
    });
    return {
      payment: toPaymentDetail(result.transaction),
      ledger: toLedgerEntryDetail(result.ledger),
      amount,
    };
  } catch (err) {
    if (err instanceof Error && err.message === "INSUFFICIENT_BALANCE") {
      throw new PaymentUseCaseError(
        PAYMENT_ERRORS.INSUFFICIENT_BALANCE.code,
        PAYMENT_ERRORS.INSUFFICIENT_BALANCE.message,
        PAYMENT_ERRORS.INSUFFICIENT_BALANCE.status,
      );
    }
    if (err instanceof Error && err.message === "WALLET_NOT_FOUND") {
      throw new PaymentUseCaseError(
        PAYMENT_ERRORS.WALLET_NOT_FOUND.code,
        PAYMENT_ERRORS.WALLET_NOT_FOUND.message,
        PAYMENT_ERRORS.WALLET_NOT_FOUND.status,
      );
    }
    if (err instanceof Error && err.message === "LEDGER_ENTRY_NOT_FOUND") {
      throw new PaymentUseCaseError(
        PAYMENT_ERRORS.LEDGER_ENTRY_NOT_FOUND.code,
        PAYMENT_ERRORS.LEDGER_ENTRY_NOT_FOUND.message,
        PAYMENT_ERRORS.LEDGER_ENTRY_NOT_FOUND.status,
      );
    }
    throw err;
  }
}

export async function getPaymentStatus(paymentId: string, userId?: string): Promise<PaymentDetail> {
  const transaction = await paymentRepository.findTransactionById(paymentId);
  if (!transaction) {
    throw new PaymentUseCaseError(
      PAYMENT_ERRORS.PAYMENT_NOT_FOUND.code,
      PAYMENT_ERRORS.PAYMENT_NOT_FOUND.message,
      PAYMENT_ERRORS.PAYMENT_NOT_FOUND.status,
    );
  }
  if (userId) {
    const ownsViaUser = transaction.userId === userId;
    let ownsViaWallet = false;
    if (transaction.walletId) {
      const wallet = await paymentRepository.findWalletById(transaction.walletId);
      ownsViaWallet = !!wallet && wallet.userId === userId;
    }
    if (!ownsViaUser && !ownsViaWallet) {
      throw new PaymentUseCaseError(
        PAYMENT_ERRORS.PAYMENT_NOT_FOUND.code,
        PAYMENT_ERRORS.PAYMENT_NOT_FOUND.message,
        PAYMENT_ERRORS.PAYMENT_NOT_FOUND.status,
      );
    }
  }
  return toPaymentDetail(transaction);
}

export async function getMyWallet(userId: string): Promise<WalletDetail> {
  return getOrCreateWallet(userId);
}

export async function listMyLedger(userId: string): Promise<LedgerEntryDetail[]> {
  const entries = await paymentRepository.listLedgerEntriesByUserId(userId);
  return entries.map(toLedgerEntryDetail);
}

export async function listMyPayments(userId: string): Promise<PaymentDetail[]> {
  const wallet = await paymentRepository.findWalletByUserId(userId);
  if (!wallet) return [];
  const txs = await paymentRepository.listTransactionsByWallet(wallet.id);
  return txs.map((t) => toPaymentDetail(t));
}

export type AdminPaymentListResult = {
  transactions: PaymentDetail[];
  total: number;
};

export async function listAllTransactions(input: {
  skip?: number;
  take?: number;
  status?: string;
}): Promise<AdminPaymentListResult> {
  const skip = input.skip ?? 0;
  const take = input.take ?? 50;
  const [transactions, total] = await Promise.all([
    paymentRepository.listAllTransactions({ skip, take, status: input.status }),
    paymentRepository.countTransactions({ status: input.status }),
  ]);
  return {
    transactions: transactions.map((t) => toPaymentDetail(t)),
    total,
  };
}

/**
 * Finance-only reconciliation command. Marks PENDING as FAILED with audit trail.
 * Idempotent for already-terminal transactions. Does not invent SUCCESS from client.
 */
export async function reconcilePayment(
  paymentId: string,
  adminUserId: string,
  reason?: string,
): Promise<PaymentDetail> {
  const transaction = await paymentRepository.findTransactionById(paymentId);
  if (!transaction) {
    throw new PaymentUseCaseError(
      PAYMENT_ERRORS.PAYMENT_NOT_FOUND.code,
      PAYMENT_ERRORS.PAYMENT_NOT_FOUND.message,
      PAYMENT_ERRORS.PAYMENT_NOT_FOUND.status,
    );
  }

  if (transaction.status !== "PENDING") {
    return toPaymentDetail(transaction);
  }

  const updated = await paymentRepository.updateTransactionStatus(paymentId, {
    status: "FAILED",
    reference: `RECONCILED_BY_ADMIN_${adminUserId}`,
  });

  await auditRepository.createAuditLog({
    userId: adminUserId,
    action: "PAYMENT_RECONCILE",
    entity: "PaymentTransaction",
    entityId: paymentId,
    metadata: { reason: reason ?? "manual_reconcile", previousStatus: "PENDING" },
  }).catch(() => {});

  return toPaymentDetail(updated);
}

/**
 * Outbound transfer initiation (finance). Creates a PENDING transfer transaction;
 * worker reconciliation remains out of scope for this lot.
 */
export async function initiateTransfer(input: {
  userId: string;
  amount: number;
  destinationReference: string;
  idempotencyKey: string;
  actorUserId: string;
}): Promise<{ transferId: string }> {
  const idempotencyKey = requireIdempotencyKey(input.idempotencyKey);
  if (input.amount <= 0) {
    throw new PaymentUseCaseError(
      PAYMENT_ERRORS.INVALID_AMOUNT.code,
      PAYMENT_ERRORS.INVALID_AMOUNT.message,
      PAYMENT_ERRORS.INVALID_AMOUNT.status,
    );
  }

  const wallet = await getOrCreateWallet(input.userId);

  const existing = await paymentRepository.findTransactionByIdempotencyKey(idempotencyKey);
  if (existing) {
    return { transferId: existing.id };
  }

  const transaction = await paymentRepository.createPaymentTransaction({
    walletId: wallet.id,
    amount: Math.floor(input.amount),
    type: "TRANSFER_OUT",
    provider: "INTERNAL",
    reference: input.destinationReference,
    idempotencyKey,
    status: "PENDING",
  });

  await auditRepository.createAuditLog({
    userId: input.actorUserId,
    action: "PAYMENT_TRANSFER_INITIATE",
    entity: "PaymentTransaction",
    entityId: transaction.id,
    metadata: { destination: input.destinationReference },
  }).catch(() => {});

  return { transferId: transaction.id };
}
