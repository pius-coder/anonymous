import { paymentRepository, auditRepository } from "@session-jeu/db";
import {
  FAPSHI_PROVIDER,
  mapFapshiWireToPaymentStatus,
  PAYMENT_ERRORS,
} from "@session-jeu/shared";
import {
  resolveServerAmount,
  type PaymentPurpose,
} from "../../payments/server-amount.js";
import {
  generateProviderExternalId,
  initiateExternalCheckout,
  verifyWebhookSecret,
} from "../../payments/provider-adapter.js";
import {
  assertSettlementMatch,
  fetchVerifiedProviderStatus,
  parseFapshiWebhookPayload,
  redactedWebhookSummary,
  webhookEventId,
} from "../../payments/fapshi-collection.js";

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

function mapProviderError(err: unknown): never {
  const code =
    err instanceof Error && "code" in err && typeof (err as { code?: string }).code === "string"
      ? (err as { code: string }).code
      : err instanceof Error
        ? err.message
        : "PROVIDER_ERROR";

  if (code === "PROVIDER_NOT_CONFIGURED") {
    throw new PaymentUseCaseError(
      PAYMENT_ERRORS.PROVIDER_NOT_CONFIGURED.code,
      PAYMENT_ERRORS.PROVIDER_NOT_CONFIGURED.message,
      PAYMENT_ERRORS.PROVIDER_NOT_CONFIGURED.status,
    );
  }
  if (code === "COLLECTION_DISABLED") {
    throw new PaymentUseCaseError(
      PAYMENT_ERRORS.COLLECTION_DISABLED.code,
      PAYMENT_ERRORS.COLLECTION_DISABLED.message,
      PAYMENT_ERRORS.COLLECTION_DISABLED.status,
    );
  }
  if (code === "PROVIDER_TIMEOUT_AMBIGUOUS") {
    throw new PaymentUseCaseError(
      PAYMENT_ERRORS.PROVIDER_TIMEOUT_AMBIGUOUS.code,
      PAYMENT_ERRORS.PROVIDER_TIMEOUT_AMBIGUOUS.message,
      PAYMENT_ERRORS.PROVIDER_TIMEOUT_AMBIGUOUS.status,
    );
  }
  if (code === "CHECKOUT_LINK_REJECTED") {
    throw new PaymentUseCaseError(
      PAYMENT_ERRORS.CHECKOUT_LINK_REJECTED.code,
      PAYMENT_ERRORS.CHECKOUT_LINK_REJECTED.message,
      PAYMENT_ERRORS.CHECKOUT_LINK_REJECTED.status,
    );
  }
  throw new PaymentUseCaseError(
    PAYMENT_ERRORS.PROVIDER_ERROR.code,
    PAYMENT_ERRORS.PROVIDER_ERROR.message,
    PAYMENT_ERRORS.PROVIDER_ERROR.status,
  );
}

export type InitiatePaymentInput = {
  userId: string;
  purpose?: PaymentPurpose;
  productCode?: string;
  currency?: string;
  idempotencyKey: string;
  requestedAmount?: number;
  email?: string;
};

export type PaymentDetail = {
  id: string;
  walletId: string | null;
  amount: number;
  type: string;
  provider: string | null;
  reference: string | null;
  status: string;
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

/** Official Fapshi webhook ingest (header secret + wire body). */
export type WebhookIngestInput = {
  /** Value of x-wh-secret header */
  webhookSecretHeader: string | undefined;
  body: unknown;
  /** When true, process payment-status + settle before returning (tests). Default async. */
  processSync?: boolean;
};

export type WebhookIngestResult = {
  received: boolean;
  inboxId: string;
  duplicate: boolean;
  paymentId?: string;
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
    providerTransId?: string | null;
    providerExternalId?: string | null;
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
    providerTransId: t.providerTransId ?? null,
    providerExternalId: t.providerExternalId ?? null,
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
 * Initiate external Fapshi collection. Amount server-resolved. Durable externalId before initiate-pay.
 * Idempotent on idempotencyKey. Never invents local checkout.
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
    // Never re-call initiate-pay for the same intent (prevents second Fapshi transaction).
    return toPaymentDetail(existing);
  }

  const type = purpose === "TOP_UP" ? "TOP_UP" : "ACCESS_FEE";
  const providerExternalId = generateProviderExternalId();

  let transaction;
  try {
    transaction = await paymentRepository.createPaymentTransaction({
      walletId: wallet.id,
      userId: input.userId,
      amount,
      currency: input.currency ?? wallet.currency,
      type,
      provider: FAPSHI_PROVIDER,
      idempotencyKey,
      status: "PENDING",
      internalStatus: "AWAITING_PROVIDER",
      wireStatus: "CREATED",
      providerExternalId,
    });
  } catch (err) {
    const raced = await paymentRepository.findTransactionByIdempotencyKey(idempotencyKey);
    if (raced) return toPaymentDetail(raced);
    throw err;
  }

  // If provider already attached (race recovery), do not re-initiate.
  if (transaction.providerTransId && transaction.checkoutUrl) {
    return toPaymentDetail(transaction);
  }

  try {
    const external = await initiateExternalCheckout({
      paymentId: transaction.id,
      transactionId: transaction.id,
      amount,
      currency: input.currency ?? wallet.currency,
      userId: input.userId,
      externalId: providerExternalId,
      idempotencyKey,
      email: input.email,
    });

    const updated = await paymentRepository.updateTransactionStatus(transaction.id, {
      status: "PENDING",
      provider: external.provider,
      reference: external.providerTransId,
      providerTransId: external.providerTransId,
      providerExternalId: external.providerExternalId,
      checkoutUrl: external.checkoutUrl,
      internalStatus: "PROVIDER_PENDING",
      wireStatus: "CREATED",
    });
    return toPaymentDetail(updated, external.checkoutUrl);
  } catch (err) {
    if (err instanceof Error && err.message === "PROVIDER_TIMEOUT_AMBIGUOUS") {
      await paymentRepository.updateTransactionStatus(transaction.id, {
        status: "PENDING",
        internalStatus: "RECONCILING",
        wireStatus: "UNSPECIFIED",
      });
      mapProviderError(err);
    }
    await paymentRepository.updateTransactionStatus(transaction.id, {
      status: "FAILED",
      internalStatus: "FAILED",
      wireStatus: "FAILED",
    }).catch(() => {});
    mapProviderError(err);
  }
}

/**
 * Webhook: verify x-wh-secret, durable inbox, then verify via payment-status before settlement.
 * Never confirms success from webhook body alone.
 */
export async function handlePaymentWebhook(
  input: WebhookIngestInput,
): Promise<WebhookIngestResult> {
  const secret = process.env.FAPSHI_WEBHOOK_SECRET;
  if (!secret) {
    throw new PaymentUseCaseError(
      PAYMENT_ERRORS.WEBHOOK_SECRET_REQUIRED.code,
      PAYMENT_ERRORS.WEBHOOK_SECRET_REQUIRED.message,
      PAYMENT_ERRORS.WEBHOOK_SECRET_REQUIRED.status,
    );
  }
  if (!verifyWebhookSecret(input.webhookSecretHeader, secret)) {
    throw new PaymentUseCaseError(
      PAYMENT_ERRORS.WEBHOOK_SIGNATURE_INVALID.code,
      PAYMENT_ERRORS.WEBHOOK_SIGNATURE_INVALID.message,
      PAYMENT_ERRORS.WEBHOOK_SIGNATURE_INVALID.status,
    );
  }

  let payload;
  try {
    payload = parseFapshiWebhookPayload(input.body);
  } catch {
    throw new PaymentUseCaseError(
      PAYMENT_ERRORS.PROVIDER_ERROR.code,
      "Corps webhook Fapshi invalide",
      400,
    );
  }

  let payment =
    (await paymentRepository.findTransactionByProviderTransId(payload.transId)) ??
    (payload.externalId
      ? await paymentRepository.findTransactionByProviderExternalId(payload.externalId)
      : null);

  const eventId = webhookEventId(payload.transId, payload.status);
  const { inbox, duplicate } = await paymentRepository.ingestProviderWebhook({
    provider: FAPSHI_PROVIDER.toLowerCase(),
    externalEventId: eventId,
    providerTransId: payload.transId,
    wireStatus: payload.status,
    paymentId: payment?.id,
    redactedSummary: redactedWebhookSummary(payload),
    serviceKind: "COLLECTION",
  });

  if (duplicate) {
    return {
      received: true,
      inboxId: inbox.id,
      duplicate: true,
      paymentId: payment?.id,
    };
  }

  const settleAfterVerify = async () => {
    try {
      await verifyAndSettleCollection({
        inboxId: inbox.id,
        providerTransId: payload.transId,
        paymentId: payment?.id,
      });
    } catch {
      // Async path: leave inbox RECEIVED for reconciliation; never invent success.
    }
  };

  if (input.processSync) {
    await settleAfterVerify();
  } else {
    // Fire-and-forget after durable inbox write (ACK fast).
    void settleAfterVerify();
  }

  return {
    received: true,
    inboxId: inbox.id,
    duplicate: false,
    paymentId: payment?.id,
  };
}

/**
 * Query official payment-status then apply settlement. Safe for webhook async + reconciliation.
 */
export async function verifyAndSettleCollection(input: {
  inboxId: string;
  providerTransId: string;
  paymentId?: string;
}): Promise<PaymentDetail | null> {
  const providerStatus = await fetchVerifiedProviderStatus(input.providerTransId);

  let payment = input.paymentId
    ? await paymentRepository.findTransactionById(input.paymentId)
    : await paymentRepository.findTransactionByProviderTransId(providerStatus.transId);

  if (!payment && providerStatus.externalId) {
    payment = await paymentRepository.findTransactionByProviderExternalId(
      providerStatus.externalId,
    );
  }
  if (!payment) {
    return null;
  }

  if (payment.type === "PRIZE") {
    assertPrizeCreditAllowed();
  }

  try {
    assertSettlementMatch({
      expectedAmountXaf: Number(payment.amount),
      expectedExternalId: payment.providerExternalId,
      expectedUserId: payment.userId,
      provider: providerStatus,
    });
  } catch {
    // Amount / identity mismatch: mark rejected via inbox only; do not mutate to SUCCESS.
    return toPaymentDetail(payment);
  }

  // For non-terminal wire, update wire/pending only.
  if (
    providerStatus.status === "CREATED" ||
    providerStatus.status === "PENDING"
  ) {
    const updated = await paymentRepository.updateTransactionStatus(payment.id, {
      status: mapFapshiWireToPaymentStatus(providerStatus.status),
      wireStatus: providerStatus.status,
      internalStatus: "PROVIDER_PENDING",
      providerTransId: providerStatus.transId,
    });
    return toPaymentDetail(updated);
  }

  const { payment: settled } = await paymentRepository.applyWebhookSettlement({
    inboxId: input.inboxId,
    transactionId: payment.id,
    wireStatus: providerStatus.status,
    providerTransId: providerStatus.transId,
    admitOnSuccess: false,
  });

  return toPaymentDetail(settled);
}

/**
 * Recoverable reconciliation when webhook was lost (Fapshi does not retry).
 */
export async function reconcileCollectionFromProvider(
  paymentId: string,
): Promise<PaymentDetail> {
  const transaction = await paymentRepository.findTransactionById(paymentId);
  if (!transaction) {
    throw new PaymentUseCaseError(
      PAYMENT_ERRORS.PAYMENT_NOT_FOUND.code,
      PAYMENT_ERRORS.PAYMENT_NOT_FOUND.message,
      PAYMENT_ERRORS.PAYMENT_NOT_FOUND.status,
    );
  }
  if (
    transaction.status === "SUCCESSFUL" ||
    transaction.status === "FAILED" ||
    transaction.status === "EXPIRED"
  ) {
    return toPaymentDetail(transaction);
  }
  if (!transaction.providerTransId) {
    throw new PaymentUseCaseError(
      PAYMENT_ERRORS.PROVIDER_ERROR.code,
      "Aucun transId fournisseur — impossible de réconcilier sans re-initiate",
      409,
    );
  }

  const providerStatus = await fetchVerifiedProviderStatus(transaction.providerTransId);
  assertSettlementMatch({
    expectedAmountXaf: Number(transaction.amount),
    expectedExternalId: transaction.providerExternalId,
    expectedUserId: transaction.userId,
    provider: providerStatus,
  });

  // Synthetic inbox row for settle path idempotence
  const eventId = webhookEventId(providerStatus.transId, `reconcile:${providerStatus.status}`);
  const { inbox } = await paymentRepository.ingestProviderWebhook({
    provider: FAPSHI_PROVIDER.toLowerCase(),
    externalEventId: eventId,
    providerTransId: providerStatus.transId,
    wireStatus: providerStatus.status,
    paymentId: transaction.id,
    redactedSummary: redactedWebhookSummary(providerStatus),
    serviceKind: "COLLECTION",
  });

  const settled = await verifyAndSettleCollection({
    inboxId: inbox.id,
    providerTransId: providerStatus.transId,
    paymentId: transaction.id,
  });
  if (!settled) {
    throw new PaymentUseCaseError(
      PAYMENT_ERRORS.PAYMENT_NOT_FOUND.code,
      PAYMENT_ERRORS.PAYMENT_NOT_FOUND.message,
      PAYMENT_ERRORS.PAYMENT_NOT_FOUND.status,
    );
  }
  return settled;
}

export async function payWithWallet(input: {
  userId: string;
  purpose?: PaymentPurpose;
  productCode?: string;
  reason: string;
  idempotencyKey: string;
  requestedAmount?: number;
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
 * Finance reconcile: prefer live Fapshi status; never invent SUCCESS without provider.
 * Falls back to FAILED only when provider confirms FAILED/EXPIRED or admin force without transId.
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

  if (transaction.status !== "PENDING" && transaction.status !== "CREATED") {
    return toPaymentDetail(transaction);
  }

  if (transaction.providerTransId) {
    try {
      const settled = await reconcileCollectionFromProvider(paymentId);
      await auditRepository.createAuditLog({
        userId: adminUserId,
        action: "PAYMENT_RECONCILE",
        entity: "PaymentTransaction",
        entityId: paymentId,
        metadata: { reason: reason ?? "provider_status", mode: "provider" },
      }).catch(() => {});
      return settled;
    } catch {
      // fall through to admin close only when explicitly requested via reason flag
    }
  }

  const updated = await paymentRepository.updateTransactionStatus(paymentId, {
    status: "FAILED",
    reference: `RECONCILED_BY_ADMIN_${adminUserId}`,
    internalStatus: "FAILED",
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
