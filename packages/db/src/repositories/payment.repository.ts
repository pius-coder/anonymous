import type { Wallet, PaymentTransaction, LedgerEntry } from "@prisma/client";
import { prisma } from "../prisma.js";
import type { CreateWalletData, CreatePaymentTransactionData, UpdateTransactionStatusData, CreateLedgerEntryFullData, ListTransactionsFilter } from "./types.js";

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
  return prisma.paymentTransaction.create({
    data: {
      walletId: data.walletId,
      amount: data.amount,
      type: data.type,
      provider: data.provider,
      reference: data.reference,
      status: data.status ?? "PENDING",
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
    data: { transactionId, debit, credit, balance, reason },
  });
}

export function listLedgerEntriesByWallet(walletId: string): Promise<LedgerEntry[]> {
  return prisma.ledgerEntry.findMany({
    where: { transaction: { walletId } },
    orderBy: { createdAt: "desc" },
  });
}

export function findTransactionById(id: string): Promise<PaymentTransaction | null> {
  return prisma.paymentTransaction.findUnique({ where: { id } });
}

export function findTransactionByReference(reference: string): Promise<PaymentTransaction | null> {
  return prisma.paymentTransaction.findFirst({ where: { reference } });
}

export function updateTransactionStatus(id: string, data: UpdateTransactionStatusData): Promise<PaymentTransaction> {
  return prisma.paymentTransaction.update({
    where: { id },
    data: {
      status: data.status,
      ...(data.provider !== undefined ? { provider: data.provider } : {}),
      ...(data.reference !== undefined ? { reference: data.reference } : {}),
    },
  });
}

export function listAllTransactions(filter: ListTransactionsFilter = {}): Promise<PaymentTransaction[]> {
  const skip = filter.skip ?? 0;
  const take = filter.take ?? 50;
  const where: Record<string, unknown> = {};
  if (filter.status) where.status = filter.status;
  if (filter.walletId) where.walletId = filter.walletId;
  return prisma.paymentTransaction.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip,
    take,
  });
}

export function countTransactions(filter: Pick<ListTransactionsFilter, "status" | "walletId"> = {}): Promise<number> {
  const where: Record<string, unknown> = {};
  if (filter.status) where.status = filter.status;
  if (filter.walletId) where.walletId = filter.walletId;
  return prisma.paymentTransaction.count({ where });
}

export function createLedgerEntryFull(data: CreateLedgerEntryFullData): Promise<LedgerEntry> {
  return prisma.ledgerEntry.create({
    data: {
      transactionId: data.transactionId,
      debit: data.debit,
      credit: data.credit,
      balance: data.balance,
      reason: data.reason,
    },
  });
}

export function findLedgerEntryByTransactionId(transactionId: string): Promise<LedgerEntry | null> {
  return prisma.ledgerEntry.findUnique({ where: { transactionId } });
}

export function listLedgerEntriesByUserId(userId: string): Promise<LedgerEntry[]> {
  return prisma.ledgerEntry.findMany({
    where: { transaction: { wallet: { userId } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateWalletBalanceAtomic(id: string, increment: number, minBalance?: number): Promise<Wallet> {
  return prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { id } });
    if (!wallet) {
      throw new Error("WALLET_NOT_FOUND");
    }
    if (minBalance !== undefined && Number(wallet.balance) < minBalance) {
      throw new Error("INSUFFICIENT_BALANCE");
    }
    return tx.wallet.update({
      where: { id },
      data: { balance: { increment } },
    });
  });
}
