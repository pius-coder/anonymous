import { z } from "zod";
import {
  LedgerDirection,
  LedgerType,
  PaymentStatus,
  Prisma,
  prisma,
  SessionRegistrationStatus,
} from "@session-jeu/db";
import { withSerializableRetry } from "../registrations/sessionRegistration.js";

export const walletLedgerQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const payWithWalletSchema = z.object({
  idempotencyKey: z.string().trim().min(8).max(200),
});

export const adminWalletAdjustmentSchema = z.object({
  amountXaf: z.number().int().positive(),
  direction: z.enum(["CREDIT", "DEBIT"]),
  reason: z.string().trim().min(3).max(500),
  idempotencyKey: z.string().trim().min(8).max(200),
  type: z.enum(["BONUS", "REFUND", "ADJUSTMENT"]).default("ADJUSTMENT"),
  referenceType: z.string().trim().min(1).max(100).optional(),
  referenceId: z.string().trim().min(1).max(200).optional(),
});

export const userIdParamsSchema = z.object({
  userId: z.string().min(1),
});

export type LedgerBalanceInput = Array<{
  direction: LedgerDirection;
  amountXaf: number;
}>;

type WalletRecord = {
  id: string;
  userId: string;
  balanceXaf: number;
  currency: string;
  isFrozen: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

type LedgerRecord = {
  id: string;
  walletId: string;
  userId: string;
  amountXaf: number;
  balanceAfterXaf: number;
  direction: LedgerDirection;
  type: LedgerType;
  description: string | null;
  referenceType: string | null;
  referenceId: string | null;
  idempotencyKey: string;
  paymentId: string | null;
  sessionId: string | null;
  createdAt: Date;
};

type RegistrationPaymentRecord = {
  id: string;
  userId: string;
  sessionId: string;
  status: string;
  paymentDeadlineAt: Date | null;
  paidAt: Date | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
} | null;

function serializeDate(date: Date) {
  return date.toISOString();
}

export function computeLedgerBalanceXaf(entries: LedgerBalanceInput) {
  return entries.reduce((balance, entry) => {
    if (entry.direction === LedgerDirection.CREDIT) return balance + entry.amountXaf;
    return balance - entry.amountXaf;
  }, 0);
}

export function serializeWallet(wallet: WalletRecord) {
  return {
    id: wallet.id,
    userId: wallet.userId,
    balanceXaf: wallet.balanceXaf,
    currency: wallet.currency,
    isFrozen: wallet.isFrozen,
    version: wallet.version,
    createdAt: serializeDate(wallet.createdAt),
    updatedAt: serializeDate(wallet.updatedAt),
  };
}

export function serializeLedgerEntry(entry: LedgerRecord) {
  return {
    id: entry.id,
    walletId: entry.walletId,
    userId: entry.userId,
    amountXaf: entry.amountXaf,
    balanceAfterXaf: entry.balanceAfterXaf,
    direction: entry.direction,
    type: entry.type,
    description: entry.description,
    referenceType: entry.referenceType,
    referenceId: entry.referenceId,
    idempotencyKey: entry.idempotencyKey,
    paymentId: entry.paymentId,
    sessionId: entry.sessionId,
    createdAt: serializeDate(entry.createdAt),
  };
}

export function serializeRegistrationPaymentResult(registration: RegistrationPaymentRecord) {
  if (!registration) return null;
  return {
    id: registration.id,
    userId: registration.userId,
    sessionId: registration.sessionId,
    status: registration.status,
    paymentDeadlineAt: registration.paymentDeadlineAt?.toISOString() ?? null,
    paidAt: registration.paidAt?.toISOString() ?? null,
    cancelledAt: registration.cancelledAt?.toISOString() ?? null,
    cancellationReason: registration.cancellationReason,
    createdAt: registration.createdAt.toISOString(),
    updatedAt: registration.updatedAt.toISOString(),
  };
}

async function ensureWalletForUser(tx: Prisma.TransactionClient, userId: string) {
  return tx.wallet.upsert({
    where: { userId },
    update: {},
    create: { userId, balanceXaf: 0, currency: "XAF" },
  });
}

export async function getWalletForUser(userId: string) {
  const wallet = await prisma.wallet.upsert({
    where: { userId },
    update: {},
    create: { userId, balanceXaf: 0, currency: "XAF" },
  });

  const ledgerBalanceXaf = computeLedgerBalanceXaf(
    await prisma.ledgerEntry.findMany({
      where: { walletId: wallet.id },
      select: { direction: true, amountXaf: true },
      orderBy: { createdAt: "asc" },
    }),
  );

  return {
    wallet,
    ledgerBalanceXaf,
    isLedgerAligned: ledgerBalanceXaf === wallet.balanceXaf,
  };
}

export async function listWalletLedger(input: { userId: string; cursor?: string; limit: number }) {
  const wallet = await prisma.wallet.findUnique({
    where: { userId: input.userId },
    include: {
      ledgers: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      },
    },
  });

  if (!wallet) {
    return { wallet: null, entries: [], nextCursor: null };
  }

  const entries = wallet.ledgers.slice(0, input.limit);
  const nextCursor = wallet.ledgers.length > input.limit ? (entries.at(-1)?.id ?? null) : null;

  return { wallet, entries, nextCursor };
}

export async function payRegistrationWithWallet(input: {
  userId: string;
  registrationId: string;
  idempotencyKey: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();

  return withSerializableRetry(() =>
    prisma.$transaction(
      async (tx) => {
        const existingLedger = await tx.ledgerEntry.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
          include: { wallet: true },
        });

        if (existingLedger) {
          if (existingLedger.wallet.userId !== input.userId) {
            return { type: "ledger-duplicate" as const };
          }

          const registration = await tx.sessionRegistration.findUnique({
            where: { id: input.registrationId },
          });

          return {
            type: "idempotent" as const,
            wallet: existingLedger.wallet,
            ledger: existingLedger,
            registration,
          };
        }

        const registration = await tx.sessionRegistration.findUnique({
          where: { id: input.registrationId },
          include: {
            session: { select: { id: true, entryFeeXaf: true } },
          },
        });

        if (!registration) return { type: "not-found" as const };
        if (registration.userId !== input.userId) return { type: "forbidden" as const };
        if (registration.status === SessionRegistrationStatus.PAID) {
          return { type: "already-paid" as const };
        }
        if (registration.status !== SessionRegistrationStatus.PAYMENT_PENDING) {
          return { type: "not-payable" as const };
        }
        if (registration.paymentDeadlineAt && registration.paymentDeadlineAt <= now) {
          return { type: "expired" as const };
        }

        const amountXaf = registration.session.entryFeeXaf;
        const wallet = await ensureWalletForUser(tx, input.userId);
        if (wallet.isFrozen) return { type: "wallet-frozen" as const };
        if (wallet.balanceXaf < amountXaf) return { type: "insufficient-funds" as const };

        const nextBalanceXaf = wallet.balanceXaf - amountXaf;
        const ledger = await tx.ledgerEntry.create({
          data: {
            walletId: wallet.id,
            userId: input.userId,
            amountXaf,
            balanceAfterXaf: nextBalanceXaf,
            direction: LedgerDirection.DEBIT,
            type: LedgerType.ENTRY_FEE,
            description: "Wallet payment for session registration",
            referenceType: "SessionRegistration",
            referenceId: registration.id,
            idempotencyKey: input.idempotencyKey,
            sessionId: registration.sessionId,
          },
        });

        const updatedWallet = await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balanceXaf: nextBalanceXaf,
            version: { increment: 1 },
          },
        });

        const updatedRegistration = await tx.sessionRegistration.update({
          where: { id: registration.id },
          data: {
            status: SessionRegistrationStatus.PAID,
            paidAt: now,
          },
        });

        const paymentTransaction = await tx.paymentTransaction.create({
          data: {
            userId: input.userId,
            sessionId: registration.sessionId,
            registrationId: registration.id,
            amount: amountXaf,
            amountXaf,
            currency: "XAF",
            status: PaymentStatus.SUCCESSFUL,
            provider: "WALLET",
          },
        });

        await tx.auditLog.create({
          data: {
            userId: input.userId,
            action: "wallet.debited",
            entity: "LedgerEntry",
            entityId: ledger.id,
            oldData: serializeWallet(wallet),
            newData: {
              wallet: serializeWallet(updatedWallet),
              ledger: serializeLedgerEntry(ledger),
              registrationId: updatedRegistration.id,
            },
          },
        });

        return {
          type: "ok" as const,
          wallet: updatedWallet,
          ledger,
          registration: updatedRegistration,
          paymentTransaction,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 10000,
      },
    ),
  );
}

export async function adjustWallet(input: {
  adminUserId: string;
  targetUserId: string;
  amountXaf: number;
  direction: "CREDIT" | "DEBIT";
  type: "BONUS" | "REFUND" | "ADJUSTMENT";
  reason: string;
  idempotencyKey: string;
  referenceType?: string;
  referenceId?: string;
}) {
  return withSerializableRetry(() =>
    prisma.$transaction(
      async (tx) => {
        const targetUser = await tx.user.findUnique({
          where: { id: input.targetUserId },
          select: { id: true },
        });
        if (!targetUser) return { type: "user-not-found" as const };

        const existingLedger = await tx.ledgerEntry.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
          include: { wallet: true },
        });
        if (existingLedger) {
          if (existingLedger.wallet.userId !== input.targetUserId) {
            return { type: "ledger-duplicate" as const };
          }
          return {
            type: "idempotent" as const,
            wallet: existingLedger.wallet,
            ledger: existingLedger,
          };
        }

        const wallet = await ensureWalletForUser(tx, input.targetUserId);
        if (wallet.isFrozen) return { type: "wallet-frozen" as const };

        const direction =
          input.direction === "CREDIT" ? LedgerDirection.CREDIT : LedgerDirection.DEBIT;
        const nextBalanceXaf =
          direction === LedgerDirection.CREDIT
            ? wallet.balanceXaf + input.amountXaf
            : wallet.balanceXaf - input.amountXaf;

        if (nextBalanceXaf < 0) return { type: "insufficient-funds" as const };

        const ledger = await tx.ledgerEntry.create({
          data: {
            walletId: wallet.id,
            userId: input.targetUserId,
            amountXaf: input.amountXaf,
            balanceAfterXaf: nextBalanceXaf,
            direction,
            type: input.type,
            description: input.reason,
            referenceType: input.referenceType ?? "AdminAdjustment",
            referenceId: input.referenceId,
            idempotencyKey: input.idempotencyKey,
          },
        });

        const updatedWallet = await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balanceXaf: nextBalanceXaf,
            version: { increment: 1 },
          },
        });

        await tx.auditLog.create({
          data: {
            userId: input.adminUserId,
            action: "wallet.adjusted",
            entity: "Wallet",
            entityId: wallet.id,
            reason: input.reason,
            oldData: serializeWallet(wallet),
            newData: {
              wallet: serializeWallet(updatedWallet),
              ledger: serializeLedgerEntry(ledger),
            },
          },
        });

        return { type: "ok" as const, wallet: updatedWallet, ledger };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 10000,
      },
    ),
  );
}
