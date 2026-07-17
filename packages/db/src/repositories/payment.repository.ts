import {
  FapshiWireStatus,
  LedgerDirection,
  LedgerType,
  PaymentInternalStatus,
  PaymentStatus,
  Prisma,
  ProviderServiceKind,
  ReconciliationStatus,
  WebhookInboxStatus,
} from "@prisma/client";
import type {
  Wallet,
  PaymentTransaction,
  LedgerEntry,
  ProviderWebhookInbox,
  ProviderCredentialRef,
  PaymentReconciliation,
} from "@prisma/client";
import { prisma } from "../prisma.js";
import type {
  CreateWalletData,
  CreatePaymentTransactionData,
  UpdateTransactionStatusData,
  CreateLedgerEntryFullData,
  ListTransactionsFilter,
  IngestWebhookData,
} from "./types.js";

function asPaymentStatus(status: PaymentStatus | string | undefined): PaymentStatus {
  if (!status) return PaymentStatus.PENDING;
  if (Object.values(PaymentStatus).includes(status as PaymentStatus)) {
    return status as PaymentStatus;
  }
  const upper = String(status).toUpperCase();
  if (upper === "COMPLETED") return PaymentStatus.SUCCESSFUL;
  if (Object.values(PaymentStatus).includes(upper as PaymentStatus)) {
    return upper as PaymentStatus;
  }
  return PaymentStatus.PENDING;
}

export function createWallet(data: CreateWalletData): Promise<Wallet> {
  return prisma.wallet.create({
    data: {
      userId: data.userId,
      currency: data.currency ?? "XAF",
    },
  });
}

export function findWalletByUserId(userId: string): Promise<Wallet | null> {
  return prisma.wallet.findUnique({ where: { userId } });
}

export function findWalletById(id: string): Promise<Wallet | null> {
  return prisma.wallet.findUnique({ where: { id } });
}

export function updateWalletBalance(id: string, balance: number): Promise<Wallet> {
  return prisma.wallet.update({ where: { id }, data: { balance } });
}

export function createPaymentTransaction(data: CreatePaymentTransactionData): Promise<PaymentTransaction> {
  const status = asPaymentStatus(data.status);
  return prisma.paymentTransaction.create({
    data: {
      walletId: data.walletId,
      userId: data.userId,
      partyId: data.partyId,
      participationId: data.participationId,
      amount: data.amount,
      currency: data.currency ?? "XAF",
      type: data.type,
      provider: data.provider,
      reference: data.reference,
      idempotencyKey: data.idempotencyKey,
      status,
      internalStatus: data.internalStatus ?? PaymentInternalStatus.PENDING,
      wireStatus: data.wireStatus ?? FapshiWireStatus.UNSPECIFIED,
      providerExternalId: data.providerExternalId,
      providerTransId: data.providerTransId,
      checkoutUrl: data.checkoutUrl,
      expiresAt: data.expiresAt,
      serviceKind: data.serviceKind ?? ProviderServiceKind.COLLECTION,
      credentialRefId: data.credentialRefId,
    },
  });
}

export function listTransactionsByWallet(walletId: string): Promise<PaymentTransaction[]> {
  return prisma.paymentTransaction.findMany({
    where: { walletId },
    orderBy: { createdAt: "desc" },
  });
}

export function createLedgerEntry(
  transactionId: string,
  debit: number,
  credit: number,
  balance: number,
  reason: string,
): Promise<LedgerEntry> {
  return prisma.ledgerEntry.create({
    data: {
      transactionId,
      debit,
      credit,
      balance,
      balanceAfter: balance,
      reason,
      direction: credit > 0 ? LedgerDirection.CREDIT : LedgerDirection.DEBIT,
    },
  });
}

export function listLedgerEntriesByWallet(walletId: string): Promise<LedgerEntry[]> {
  return prisma.ledgerEntry.findMany({
    where: {
      OR: [{ walletId }, { transaction: { walletId } }],
    },
    orderBy: { createdAt: "desc" },
  });
}

export function findTransactionById(id: string): Promise<PaymentTransaction | null> {
  return prisma.paymentTransaction.findUnique({ where: { id } });
}

export function findTransactionByReference(reference: string): Promise<PaymentTransaction | null> {
  return prisma.paymentTransaction.findFirst({ where: { reference } });
}

export function findTransactionByIdempotencyKey(idempotencyKey: string): Promise<PaymentTransaction | null> {
  return prisma.paymentTransaction.findUnique({ where: { idempotencyKey } });
}

export function findTransactionByProviderTransId(providerTransId: string): Promise<PaymentTransaction | null> {
  return prisma.paymentTransaction.findFirst({ where: { providerTransId } });
}

export function findTransactionByProviderExternalId(
  providerExternalId: string,
): Promise<PaymentTransaction | null> {
  return prisma.paymentTransaction.findFirst({ where: { providerExternalId } });
}

export function updateTransactionStatus(
  id: string,
  data: UpdateTransactionStatusData,
): Promise<PaymentTransaction> {
  return prisma.paymentTransaction.update({
    where: { id },
    data: {
      status: asPaymentStatus(data.status),
      ...(data.provider !== undefined ? { provider: data.provider } : {}),
      ...(data.reference !== undefined ? { reference: data.reference } : {}),
      ...(data.internalStatus !== undefined ? { internalStatus: data.internalStatus } : {}),
      ...(data.wireStatus !== undefined ? { wireStatus: data.wireStatus } : {}),
      ...(data.settledAt !== undefined ? { settledAt: data.settledAt } : {}),
    },
  });
}

function buildTransactionWhere(
  filter: ListTransactionsFilter,
): Prisma.PaymentTransactionWhereInput {
  const where: Prisma.PaymentTransactionWhereInput = {};
  if (filter.status) where.status = asPaymentStatus(filter.status);
  if (filter.walletId) where.walletId = filter.walletId;
  if (filter.serviceKind) where.serviceKind = filter.serviceKind;
  if (filter.type) where.type = filter.type;
  if (filter.userId) where.userId = filter.userId;
  if (filter.createdAfter) where.createdAt = { gte: filter.createdAfter };
  return where;
}

export function listAllTransactions(filter: ListTransactionsFilter = {}): Promise<PaymentTransaction[]> {
  const skip = filter.skip ?? 0;
  const take = filter.take ?? 50;
  return prisma.paymentTransaction.findMany({
    where: buildTransactionWhere(filter),
    orderBy: { createdAt: "desc" },
    skip,
    take,
  });
}

export function countTransactions(filter: ListTransactionsFilter = {}): Promise<number> {
  return prisma.paymentTransaction.count({ where: buildTransactionWhere(filter) });
}

/** Cursor-style page for reconciliation workers (oldest PENDING first). */
export function listPendingForReconciliation(input: {
  skip?: number;
  take?: number;
  serviceKind?: ProviderServiceKind;
}): Promise<PaymentTransaction[]> {
  return prisma.paymentTransaction.findMany({
    where: {
      status: PaymentStatus.PENDING,
      ...(input.serviceKind ? { serviceKind: input.serviceKind } : {}),
    },
    orderBy: { createdAt: "asc" },
    skip: input.skip ?? 0,
    take: input.take ?? 50,
  });
}

export function listReconciliations(filter: {
  status?: ReconciliationStatus;
  skip?: number;
  take?: number;
}): Promise<PaymentReconciliation[]> {
  return prisma.paymentReconciliation.findMany({
    where: filter.status ? { status: filter.status } : undefined,
    orderBy: { createdAt: "desc" },
    skip: filter.skip ?? 0,
    take: filter.take ?? 50,
  });
}

export function findReconciliationById(id: string): Promise<PaymentReconciliation | null> {
  return prisma.paymentReconciliation.findUnique({ where: { id } });
}

export function findOpenReconciliationForPayment(
  paymentId: string,
): Promise<PaymentReconciliation | null> {
  return prisma.paymentReconciliation.findFirst({
    where: {
      paymentId,
      status: { in: [ReconciliationStatus.PENDING, ReconciliationStatus.MISMATCH] },
    },
    orderBy: { createdAt: "desc" },
  });
}

export function countLedgerEntries(filter: { createdAfter?: Date } = {}): Promise<number> {
  return prisma.ledgerEntry.count({
    where: filter.createdAfter ? { createdAt: { gte: filter.createdAfter } } : undefined,
  });
}

export function sumLedgerCredits(filter: { createdAfter?: Date } = {}): Promise<number> {
  return prisma.ledgerEntry
    .aggregate({
      where: filter.createdAfter ? { createdAt: { gte: filter.createdAfter } } : undefined,
      _sum: { credit: true },
    })
    .then((r) => Number(r._sum.credit ?? 0));
}

export function sumLedgerDebits(filter: { createdAfter?: Date } = {}): Promise<number> {
  return prisma.ledgerEntry
    .aggregate({
      where: filter.createdAfter ? { createdAt: { gte: filter.createdAfter } } : undefined,
      _sum: { debit: true },
    })
    .then((r) => Number(r._sum.debit ?? 0));
}

export function countPaidParticipations(): Promise<number> {
  return prisma.partyParticipation.count({
    where: { paymentState: "PAID" },
  });
}

export function listWallets(filter: { skip?: number; take?: number } = {}): Promise<Wallet[]> {
  return prisma.wallet.findMany({
    orderBy: { updatedAt: "desc" },
    skip: filter.skip ?? 0,
    take: filter.take ?? 50,
  });
}

export function sumWalletBalances(): Promise<number> {
  return prisma.wallet
    .aggregate({ _sum: { balance: true } })
    .then((r) => Number(r._sum.balance ?? 0));
}

export function createLedgerEntryFull(data: CreateLedgerEntryFullData): Promise<LedgerEntry> {
  return prisma.ledgerEntry.create({
    data: {
      transactionId: data.transactionId,
      debit: data.debit,
      credit: data.credit,
      balance: data.balance,
      balanceAfter: data.balanceAfter ?? data.balance,
      reason: data.reason,
      idempotencyKey: data.idempotencyKey,
      walletId: data.walletId,
      direction: data.direction,
      ledgerType: data.ledgerType,
      compensationOfId: data.compensationOfId,
    },
  });
}

export function findLedgerEntryByTransactionId(transactionId: string): Promise<LedgerEntry | null> {
  return prisma.ledgerEntry.findUnique({ where: { transactionId } });
}

export function findLedgerEntryByIdempotencyKey(idempotencyKey: string): Promise<LedgerEntry | null> {
  return prisma.ledgerEntry.findUnique({ where: { idempotencyKey } });
}

export function listLedgerEntriesByUserId(userId: string): Promise<LedgerEntry[]> {
  return prisma.ledgerEntry.findMany({
    where: {
      OR: [{ wallet: { userId } }, { transaction: { wallet: { userId } } }],
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateWalletBalanceAtomic(
  id: string,
  increment: number,
  minBalance?: number,
): Promise<Wallet> {
  return prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { id } });
    if (!wallet) {
      throw new Error("WALLET_NOT_FOUND");
    }
    if (wallet.isFrozen) {
      throw new Error("WALLET_FROZEN");
    }
    if (minBalance !== undefined && Number(wallet.balance) < minBalance) {
      throw new Error("INSUFFICIENT_BALANCE");
    }
    return tx.wallet.update({
      where: { id },
      data: { balance: { increment }, version: { increment: 1 } },
    });
  });
}

export type WalletDebitPaymentResult = {
  transaction: PaymentTransaction;
  ledger: LedgerEntry;
};

export async function createWalletDebitPayment(input: {
  walletId: string;
  amount: number;
  reason: string;
  idempotencyKey?: string;
  partyId?: string;
  participationId?: string;
  userId?: string;
  _attempt?: number;
}): Promise<WalletDebitPaymentResult> {
  const attempt = input._attempt ?? 0;
  try {
    return await prisma.$transaction(
      async (tx) => {
        if (input.idempotencyKey) {
          const existing = await tx.paymentTransaction.findUnique({
            where: { idempotencyKey: input.idempotencyKey },
            include: { ledgerEntry: true },
          });
          if (existing) {
            if (!existing.ledgerEntry) {
              throw new Error("LEDGER_ENTRY_NOT_FOUND");
            }
            return { transaction: existing, ledger: existing.ledgerEntry };
          }
        }

        const wallet = await tx.wallet.findUnique({ where: { id: input.walletId } });
        if (!wallet) {
          throw new Error("WALLET_NOT_FOUND");
        }
        if (wallet.isFrozen) {
          throw new Error("WALLET_FROZEN");
        }
        if (Number(wallet.balance) < input.amount) {
          throw new Error("INSUFFICIENT_BALANCE");
        }

        const transaction = await tx.paymentTransaction.create({
          data: {
            walletId: input.walletId,
            userId: input.userId ?? wallet.userId,
            partyId: input.partyId,
            participationId: input.participationId,
            amount: input.amount,
            type: "ACCESS_FEE",
            provider: "WALLET",
            reference: input.idempotencyKey,
            idempotencyKey: input.idempotencyKey,
            status: PaymentStatus.SUCCESSFUL,
            internalStatus: PaymentInternalStatus.SUCCEEDED,
            serviceKind: ProviderServiceKind.COLLECTION,
            settledAt: new Date(),
          },
        });
        const updatedWallet = await tx.wallet.update({
          where: { id: input.walletId },
          data: { balance: { decrement: input.amount }, version: { increment: 1 } },
        });
        const ledger = await tx.ledgerEntry.create({
          data: {
            transactionId: transaction.id,
            walletId: input.walletId,
            debit: input.amount,
            credit: 0,
            balance: updatedWallet.balance,
            balanceAfter: updatedWallet.balance,
            reason: input.reason,
            idempotencyKey: input.idempotencyKey,
            direction: LedgerDirection.DEBIT,
            ledgerType: LedgerType.ACCESS_FEE,
          },
        });

        if (input.participationId) {
          await tx.partyParticipation.update({
            where: { id: input.participationId },
            data: {
              paymentState: "PAID",
              paymentTransactionId: transaction.id,
            },
          });
        }

        return { transaction, ledger };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      input.idempotencyKey
    ) {
      const existing = await prisma.paymentTransaction.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: { ledgerEntry: true },
      });
      if (existing?.ledgerEntry) {
        return { transaction: existing, ledger: existing.ledgerEntry };
      }
    }
    const message = error instanceof Error ? error.message : String(error);
    const isSerialize =
      (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") ||
      /could not serialize|40001/i.test(message);
    if (isSerialize && attempt < 12) {
      return createWalletDebitPayment({ ...input, _attempt: attempt + 1 });
    }
    throw error;
  }
}

/**
 * Create a provider checkout payment (collection service) with Fapshi id slots.
 */
export async function createCheckoutPayment(input: {
  amount: number;
  currency?: string;
  userId: string;
  partyId: string;
  participationId: string;
  walletId?: string;
  providerExternalId: string;
  idempotencyKey: string;
  checkoutUrl?: string;
  expiresAt?: Date;
  credentialRefId?: string;
  provider?: string;
}): Promise<PaymentTransaction> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.paymentTransaction.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) return existing;

    const payment = await tx.paymentTransaction.create({
      data: {
        walletId: input.walletId,
        userId: input.userId,
        partyId: input.partyId,
        participationId: input.participationId,
        amount: input.amount,
        currency: input.currency ?? "XAF",
        type: "ENTRY_FEE",
        provider: input.provider ?? "fapshi",
        providerExternalId: input.providerExternalId,
        idempotencyKey: input.idempotencyKey,
        status: PaymentStatus.PENDING,
        internalStatus: PaymentInternalStatus.AWAITING_PROVIDER,
        wireStatus: FapshiWireStatus.CREATED,
        checkoutUrl: input.checkoutUrl,
        expiresAt: input.expiresAt,
        serviceKind: ProviderServiceKind.COLLECTION,
        credentialRefId: input.credentialRefId,
      },
    });

    await tx.partyParticipation.update({
      where: { id: input.participationId },
      data: {
        paymentState: "PAYMENT_PENDING",
        paymentTransactionId: payment.id,
      },
    });

    return payment;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

/**
 * Idempotent webhook inbox ingest. Duplicate externalEventId returns DUPLICATE status.
 */
export async function ingestProviderWebhook(
  data: IngestWebhookData,
): Promise<{ inbox: ProviderWebhookInbox; duplicate: boolean }> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.providerWebhookInbox.findUnique({
      where: {
        provider_externalEventId: {
          provider: data.provider,
          externalEventId: data.externalEventId,
        },
      },
    });
    if (existing) {
      return { inbox: existing, duplicate: true };
    }

    try {
      const inbox = await tx.providerWebhookInbox.create({
        data: {
          provider: data.provider,
          externalEventId: data.externalEventId,
          providerTransId: data.providerTransId,
          wireStatus: data.wireStatus ?? FapshiWireStatus.UNSPECIFIED,
          inboxStatus: WebhookInboxStatus.RECEIVED,
          paymentId: data.paymentId,
          redactedSummary: data.redactedSummary,
          serviceKind: data.serviceKind ?? ProviderServiceKind.COLLECTION,
        },
      });
      return { inbox, duplicate: false };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const again = await tx.providerWebhookInbox.findUnique({
          where: {
            provider_externalEventId: {
              provider: data.provider,
              externalEventId: data.externalEventId,
            },
          },
        });
        if (again) return { inbox: again, duplicate: true };
      }
      throw error;
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

/**
 * Apply a verified webhook to a payment once. Never double-credits wallet/ledger.
 * Optionally admits participation when collection succeeds.
 */
export async function applyWebhookSettlement(input: {
  inboxId: string;
  transactionId: string;
  wireStatus: FapshiWireStatus;
  providerTransId?: string;
  admitOnSuccess?: boolean;
  _attempt?: number;
}): Promise<{ payment: PaymentTransaction; applied: boolean }> {
  const attempt = input._attempt ?? 0;
  try {
  return await prisma.$transaction(async (tx) => {
    const inbox = await tx.providerWebhookInbox.findUnique({ where: { id: input.inboxId } });
    if (!inbox) {
      throw new Error("WEBHOOK_INBOX_NOT_FOUND");
    }
    if (
      inbox.inboxStatus === WebhookInboxStatus.APPLIED ||
      inbox.inboxStatus === WebhookInboxStatus.DUPLICATE
    ) {
      const payment = await tx.paymentTransaction.findUniqueOrThrow({
        where: { id: input.transactionId },
      });
      return { payment, applied: false };
    }

    const transaction = await tx.paymentTransaction.findUnique({
      where: { id: input.transactionId },
      include: { ledgerEntry: true },
    });
    if (!transaction) {
      throw new Error("PAYMENT_NOT_FOUND");
    }

    if (
      transaction.status === PaymentStatus.SUCCESSFUL ||
      transaction.status === PaymentStatus.FAILED ||
      transaction.status === PaymentStatus.EXPIRED
    ) {
      await tx.providerWebhookInbox.update({
        where: { id: input.inboxId },
        data: {
          inboxStatus: WebhookInboxStatus.DUPLICATE,
          processedAt: new Date(),
          paymentId: transaction.id,
          providerTransId: input.providerTransId ?? inbox.providerTransId,
          wireStatus: input.wireStatus,
        },
      });
      return { payment: transaction, applied: false };
    }

    const success = input.wireStatus === FapshiWireStatus.SUCCESSFUL;
    const failed = input.wireStatus === FapshiWireStatus.FAILED;
    const expired = input.wireStatus === FapshiWireStatus.EXPIRED;

    const nextStatus = success
      ? PaymentStatus.SUCCESSFUL
      : failed
        ? PaymentStatus.FAILED
        : expired
          ? PaymentStatus.EXPIRED
          : PaymentStatus.PENDING;

    const nextInternal = success
      ? PaymentInternalStatus.SUCCEEDED
      : failed
        ? PaymentInternalStatus.FAILED
        : expired
          ? PaymentInternalStatus.EXPIRED
          : PaymentInternalStatus.PROVIDER_PENDING;

    const updated = await tx.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status: nextStatus,
        internalStatus: nextInternal,
        wireStatus: input.wireStatus,
        providerTransId: input.providerTransId ?? transaction.providerTransId,
        settledAt: success ? new Date() : transaction.settledAt,
      },
    });

    if (success && transaction.walletId && !transaction.ledgerEntry && transaction.type !== "ACCESS_FEE") {
      // Collection success for provider path: do not auto-credit wallet for entry fees.
      // Prize/credit types may credit; entry fee only links admission.
    }

    if (success && input.admitOnSuccess && transaction.participationId) {
      await tx.partyParticipation.update({
        where: { id: transaction.participationId },
        data: {
          paymentState: "PAID",
          admissionState: "ADMITTED",
          paymentTransactionId: transaction.id,
        },
      });
    } else if (success && transaction.participationId) {
      await tx.partyParticipation.update({
        where: { id: transaction.participationId },
        data: {
          paymentState: "PAID",
          paymentTransactionId: transaction.id,
        },
      });
    }

    await tx.providerWebhookInbox.update({
      where: { id: input.inboxId },
      data: {
        inboxStatus: WebhookInboxStatus.APPLIED,
        processedAt: new Date(),
        paymentId: transaction.id,
        providerTransId: input.providerTransId ?? inbox.providerTransId,
        wireStatus: input.wireStatus,
      },
    });

    return { payment: updated, applied: true };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isSerialize =
      (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") ||
      /could not serialize|40001/i.test(message);
    if (isSerialize && attempt < 12) {
      return applyWebhookSettlement({ ...input, _attempt: attempt + 1 });
    }
    throw error;
  }
}

/** @deprecated Prefer applyWebhookSettlement + ingestProviderWebhook for production. */
export async function settlePaymentWebhook(input: {
  transactionId: string;
  status: string;
  providerReference: string;
}): Promise<PaymentTransaction | null> {
  return prisma.$transaction(async (tx) => {
    const transaction = await tx.paymentTransaction.findUnique({
      where: { id: input.transactionId },
      include: { ledgerEntry: true },
    });
    if (!transaction) {
      return null;
    }
    if (
      transaction.status === PaymentStatus.SUCCESSFUL ||
      transaction.status === PaymentStatus.FAILED
    ) {
      return transaction;
    }

    const status = asPaymentStatus(input.status);
    const updated = await tx.paymentTransaction.update({
      where: { id: input.transactionId },
      data: {
        status,
        reference: input.providerReference,
        internalStatus:
          status === PaymentStatus.SUCCESSFUL
            ? PaymentInternalStatus.SUCCEEDED
            : status === PaymentStatus.FAILED
              ? PaymentInternalStatus.FAILED
              : PaymentInternalStatus.PROVIDER_PENDING,
        settledAt: status === PaymentStatus.SUCCESSFUL ? new Date() : undefined,
      },
    });

    if (
      status === PaymentStatus.SUCCESSFUL &&
      transaction.type !== "WALLET_CREDIT" &&
      !transaction.ledgerEntry &&
      transaction.walletId
    ) {
      const updatedWallet = await tx.wallet.update({
        where: { id: transaction.walletId },
        data: { balance: { increment: Number(transaction.amount) }, version: { increment: 1 } },
      });
      await tx.ledgerEntry.create({
        data: {
          transactionId: transaction.id,
          walletId: transaction.walletId,
          debit: 0,
          credit: Number(transaction.amount),
          balance: updatedWallet.balance,
          balanceAfter: updatedWallet.balance,
          reason: "Paiement externe reçu",
          direction: LedgerDirection.CREDIT,
          ledgerType: LedgerType.WALLET_CREDIT,
        },
      });
    }

    return updated;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

/**
 * Create a payout transfer payment (distinct serviceKind + credential).
 */
export async function createPayoutTransfer(input: {
  amount: number;
  userId: string;
  walletId?: string;
  destinationReference: string;
  idempotencyKey: string;
  credentialRefId?: string;
}): Promise<PaymentTransaction> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.paymentTransaction.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) return existing;

    return tx.paymentTransaction.create({
      data: {
        walletId: input.walletId,
        userId: input.userId,
        amount: input.amount,
        type: "PAYOUT",
        provider: "fapshi",
        reference: input.destinationReference,
        idempotencyKey: input.idempotencyKey,
        status: PaymentStatus.PENDING,
        internalStatus: PaymentInternalStatus.AWAITING_PROVIDER,
        serviceKind: ProviderServiceKind.PAYOUT,
        credentialRefId: input.credentialRefId,
      },
    });
  });
}

/**
 * Compensating ledger entry (never mutates original immutable row).
 */
export async function createCompensationLedgerEntry(input: {
  originalLedgerId: string;
  transactionId: string;
  walletId: string;
  amount: number;
  reason: string;
  idempotencyKey: string;
}): Promise<LedgerEntry> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.ledgerEntry.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) return existing;

    const original = await tx.ledgerEntry.findUnique({ where: { id: input.originalLedgerId } });
    if (!original) throw new Error("LEDGER_ENTRY_NOT_FOUND");

    const already = await tx.ledgerEntry.findUnique({
      where: { compensationOfId: input.originalLedgerId },
    });
    if (already) return already;

    const wallet = await tx.wallet.findUnique({ where: { id: input.walletId } });
    if (!wallet) throw new Error("WALLET_NOT_FOUND");

    // Reverse: original debit → compensation credit (and vice versa).
    const wasDebit = Number(original.debit) > 0;
    const updatedWallet = await tx.wallet.update({
      where: { id: input.walletId },
      data: {
        balance: wasDebit
          ? { increment: input.amount }
          : { decrement: input.amount },
        version: { increment: 1 },
      },
    });

    return tx.ledgerEntry.create({
      data: {
        transactionId: input.transactionId,
        walletId: input.walletId,
        debit: wasDebit ? 0 : input.amount,
        credit: wasDebit ? input.amount : 0,
        balance: updatedWallet.balance,
        balanceAfter: updatedWallet.balance,
        reason: input.reason,
        idempotencyKey: input.idempotencyKey,
        direction: wasDebit ? LedgerDirection.CREDIT : LedgerDirection.DEBIT,
        ledgerType: LedgerType.COMPENSATION,
        compensationOfId: input.originalLedgerId,
      },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export function upsertProviderCredentialRef(input: {
  serviceKind: ProviderServiceKind;
  name: string;
  envKeyName: string;
  provider?: string;
  isActive?: boolean;
}): Promise<ProviderCredentialRef> {
  return prisma.providerCredentialRef.upsert({
    where: {
      serviceKind_name: { serviceKind: input.serviceKind, name: input.name },
    },
    create: {
      serviceKind: input.serviceKind,
      name: input.name,
      envKeyName: input.envKeyName,
      provider: input.provider ?? "fapshi",
      isActive: input.isActive ?? true,
    },
    update: {
      envKeyName: input.envKeyName,
      provider: input.provider ?? "fapshi",
      isActive: input.isActive ?? true,
    },
  });
}

export function listProviderCredentialRefs(
  serviceKind?: ProviderServiceKind,
): Promise<ProviderCredentialRef[]> {
  return prisma.providerCredentialRef.findMany({
    where: {
      ...(serviceKind ? { serviceKind } : {}),
      isActive: true,
    },
  });
}

export function createReconciliation(input: {
  paymentId: string;
  status?: ReconciliationStatus;
  notes?: string;
}): Promise<PaymentReconciliation> {
  return prisma.paymentReconciliation.create({
    data: {
      paymentId: input.paymentId,
      status: input.status ?? ReconciliationStatus.PENDING,
      notes: input.notes,
    },
  });
}

export function updateReconciliation(
  id: string,
  data: { status: ReconciliationStatus; notes?: string; resolvedAt?: Date },
): Promise<PaymentReconciliation> {
  return prisma.paymentReconciliation.update({
    where: { id },
    data: {
      status: data.status,
      notes: data.notes,
      resolvedAt: data.resolvedAt,
    },
  });
}

export function listWebhookInboxByPayment(paymentId: string): Promise<ProviderWebhookInbox[]> {
  return prisma.providerWebhookInbox.findMany({
    where: { paymentId },
    orderBy: { receivedAt: "asc" },
  });
}

/**
 * Expire pending checkouts past expiresAt (idempotent status flip).
 */
export async function expireDueCheckouts(now = new Date()): Promise<number> {
  const result = await prisma.paymentTransaction.updateMany({
    where: {
      status: PaymentStatus.PENDING,
      expiresAt: { lte: now },
      serviceKind: ProviderServiceKind.COLLECTION,
    },
    data: {
      status: PaymentStatus.EXPIRED,
      internalStatus: PaymentInternalStatus.EXPIRED,
      wireStatus: FapshiWireStatus.EXPIRED,
    },
  });
  return result.count;
}
