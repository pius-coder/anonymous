import { prisma } from "../prisma.js";
import type { Wallet, PaymentTransaction, LedgerEntry, CreateWalletData, CreatePaymentTransactionData } from "./types.js";

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
