import { paymentRepository } from "@session-jeu/db";
import { PAYMENT_ERRORS } from "@session-jeu/shared";

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

export type InitiatePaymentInput = {
  userId: string;
  amount: number;
  currency?: string;
  idempotencyKey?: string;
};

export type PaymentDetail = {
  id: string;
  walletId: string;
  amount: number;
  type: string;
  provider: string | null;
  reference: string | null;
  status: string;
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
};

type WithNumeric = { toNumber(): number };

function toPaymentDetail(t: {
  id: string;
  walletId: string;
  amount: number | WithNumeric;
  type: string;
  provider: string | null;
  reference: string | null;
  status: string;
  createdAt: Date;
}): PaymentDetail {
  return {
    id: t.id,
    walletId: t.walletId,
    amount: Number(t.amount),
    type: t.type,
    provider: t.provider,
    reference: t.reference,
    status: t.status,
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

export async function getOrCreateWallet(userId: string): Promise<WalletDetail> {
  const existing = await paymentRepository.findWalletByUserId(userId);
  if (existing) {
    return toWalletDetail(existing);
  }
  const created = await paymentRepository.createWallet({ userId });
  return toWalletDetail(created);
}

export async function initiatePayment(input: InitiatePaymentInput): Promise<PaymentDetail> {
  if (input.amount <= 0) {
    throw new PaymentUseCaseError(PAYMENT_ERRORS.INVALID_AMOUNT.code, PAYMENT_ERRORS.INVALID_AMOUNT.message, 400);
  }

  const wallet = await getOrCreateWallet(input.userId);

  if (input.idempotencyKey) {
    const existing = await paymentRepository.findTransactionByIdempotencyKey(input.idempotencyKey);
    if (existing) {
      return toPaymentDetail(existing);
    }
  }

  const transaction = await paymentRepository.createPaymentTransaction({
    walletId: wallet.id,
    amount: input.amount,
    type: "ACCESS_FEE",
    provider: "FAPSHI",
    reference: input.idempotencyKey,
    idempotencyKey: input.idempotencyKey,
    status: "PENDING",
  });

  return toPaymentDetail(transaction);
}

export async function handlePaymentWebhook(payload: WebhookPayload): Promise<PaymentDetail> {
  const secret = process.env.FAPSHI_WEBHOOK_SECRET;
  if (secret && payload.signature !== secret) {
    throw new PaymentUseCaseError(PAYMENT_ERRORS.WEBHOOK_SIGNATURE_INVALID.code, PAYMENT_ERRORS.WEBHOOK_SIGNATURE_INVALID.message, 401);
  }

  const transaction = await paymentRepository.findTransactionById(payload.transactionId);
  if (!transaction) {
    throw new PaymentUseCaseError(PAYMENT_ERRORS.PAYMENT_NOT_FOUND.code, PAYMENT_ERRORS.PAYMENT_NOT_FOUND.message, 404);
  }

  if (transaction.status === "SUCCESSFUL" || transaction.status === "FAILED") {
    return toPaymentDetail(transaction);
  }

  const newStatus = payload.status === "SUCCESS" ? "SUCCESSFUL" : payload.status === "FAILED" ? "FAILED" : "PENDING";

  const updated = await paymentRepository.settlePaymentWebhook({
    transactionId: payload.transactionId,
    status: newStatus,
    providerReference: payload.providerReference,
  });
  if (!updated) {
    throw new PaymentUseCaseError(PAYMENT_ERRORS.PAYMENT_NOT_FOUND.code, PAYMENT_ERRORS.PAYMENT_NOT_FOUND.message, 404);
  }

  return toPaymentDetail(updated);
}

export async function payWithWallet(input: {
  userId: string;
  amount: number;
  reason: string;
  idempotencyKey?: string;
}): Promise<{ payment: PaymentDetail; ledger: LedgerEntryDetail }> {
  if (input.amount <= 0) {
    throw new PaymentUseCaseError(PAYMENT_ERRORS.INVALID_AMOUNT.code, PAYMENT_ERRORS.INVALID_AMOUNT.message, 400);
  }

  const wallet = await paymentRepository.findWalletByUserId(input.userId);
  if (!wallet) {
    throw new PaymentUseCaseError(PAYMENT_ERRORS.WALLET_NOT_FOUND.code, PAYMENT_ERRORS.WALLET_NOT_FOUND.message, 404);
  }

  try {
    const result = await paymentRepository.createWalletDebitPayment({
      walletId: wallet.id,
      amount: input.amount,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
    });
    return {
      payment: toPaymentDetail(result.transaction),
      ledger: toLedgerEntryDetail(result.ledger),
    };
  } catch (err) {
    if (err instanceof Error && err.message === "INSUFFICIENT_BALANCE") {
      throw new PaymentUseCaseError(PAYMENT_ERRORS.INSUFFICIENT_BALANCE.code, PAYMENT_ERRORS.INSUFFICIENT_BALANCE.message, 422);
    }
    if (err instanceof Error && err.message === "WALLET_NOT_FOUND") {
      throw new PaymentUseCaseError(PAYMENT_ERRORS.WALLET_NOT_FOUND.code, PAYMENT_ERRORS.WALLET_NOT_FOUND.message, 404);
    }
    if (err instanceof Error && err.message === "LEDGER_ENTRY_NOT_FOUND") {
      throw new PaymentUseCaseError(PAYMENT_ERRORS.LEDGER_ENTRY_NOT_FOUND.code, PAYMENT_ERRORS.LEDGER_ENTRY_NOT_FOUND.message, 404);
    }
    throw err;
  }
}

export async function getPaymentStatus(paymentId: string, userId?: string): Promise<PaymentDetail> {
  const transaction = await paymentRepository.findTransactionById(paymentId);
  if (!transaction) {
    throw new PaymentUseCaseError(PAYMENT_ERRORS.PAYMENT_NOT_FOUND.code, PAYMENT_ERRORS.PAYMENT_NOT_FOUND.message, 404);
  }
  if (userId) {
    const wallet = await paymentRepository.findWalletById(transaction.walletId);
    if (!wallet || wallet.userId !== userId) {
      throw new PaymentUseCaseError(PAYMENT_ERRORS.PAYMENT_NOT_FOUND.code, PAYMENT_ERRORS.PAYMENT_NOT_FOUND.message, 404);
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
    transactions: transactions.map(toPaymentDetail),
    total,
  };
}

export async function reconcilePayment(paymentId: string, adminUserId: string): Promise<PaymentDetail> {
  const transaction = await paymentRepository.findTransactionById(paymentId);
  if (!transaction) {
    throw new PaymentUseCaseError(PAYMENT_ERRORS.PAYMENT_NOT_FOUND.code, PAYMENT_ERRORS.PAYMENT_NOT_FOUND.message, 404);
  }

  if (transaction.status !== "PENDING") {
    return toPaymentDetail(transaction);
  }

  const updated = await paymentRepository.updateTransactionStatus(paymentId, {
    status: "FAILED",
    reference: `RECONCILED_BY_ADMIN_${adminUserId}`,
  });

  return toPaymentDetail(updated);
}
