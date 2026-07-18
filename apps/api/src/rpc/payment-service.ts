import { Code, ConnectError, type ServiceImpl } from "@connectrpc/connect";
import { PaymentV1 } from "@session-jeu/contracts";
import {
  PaymentUseCaseError,
  getMyWallet,
  initiatePayment,
  initiateTransfer,
  listMyLedger,
  listMyPayments,
} from "../use-cases/payment/payment.use-case.js";
import { connectCodeFromHttpStatus, requireRpcRole, requireRpcUser } from "./auth-context.js";

/**
 * ConnectRPC PaymentService implementation.
 * Exported for SEQ-03 merge train — not registered in the central RPC router here
 * (A-PAYMENT ownership forbids editing the central router).
 */

function toTimestamp(value: string | Date) {
  const milliseconds = new Date(value).getTime();
  return {
    seconds: BigInt(Math.floor(milliseconds / 1_000)),
    nanos: (milliseconds % 1_000) * 1_000_000,
  };
}

function toMoney(amount: number, currency = "XAF") {
  return {
    currency,
    units: BigInt(Math.floor(amount)),
    nanos: 0,
  };
}

function toPaymentStatus(status: string): PaymentV1.PaymentStatus {
  switch (status) {
    case "PENDING":
      return PaymentV1.PaymentStatus.PENDING;
    case "SUCCESSFUL":
      return PaymentV1.PaymentStatus.SUCCESSFUL;
    case "FAILED":
      return PaymentV1.PaymentStatus.FAILED;
    case "EXPIRED":
      return PaymentV1.PaymentStatus.EXPIRED;
    case "REFUNDED":
      return PaymentV1.PaymentStatus.REFUNDED;
    default:
      return PaymentV1.PaymentStatus.UNSPECIFIED;
  }
}

function handleUseCaseError(error: unknown): never {
  if (error instanceof PaymentUseCaseError) {
    throw new ConnectError(error.message, connectCodeFromHttpStatus(error.httpStatus));
  }
  throw ConnectError.from(error, Code.Internal);
}

function correlationKey(correlationId: { value?: string } | undefined, fallback: string): string {
  const value = correlationId?.value?.trim();
  if (value && value.length >= 8) return value;
  return fallback;
}

export const paymentService: Partial<ServiceImpl<typeof PaymentV1.PaymentService>> = {
  async processPayment(request, context) {
    const user = await requireRpcUser(context);
    const amountUnits = request.amount ? Number(request.amount.units) : undefined;
    const currency = request.amount?.currency || "XAF";
    const provider = (request.provider || "FAPSHI").toUpperCase();
    const purpose = provider === "WALLET" ? ("ACCESS_FEE" as const) : ("TOP_UP" as const);

    try {
      const result = await initiatePayment({
        userId: user.id,
        purpose,
        currency,
        requestedAmount: amountUnits,
        idempotencyKey: correlationKey(request.correlationId, `pay-${user.id}-${amountUnits ?? 0}`),
      });
      return {
        paymentId: result.id,
        checkoutUrl: result.checkoutUrl ?? "",
      };
    } catch (error) {
      handleUseCaseError(error);
    }
  },

  async initiateTransfer(request, context) {
    const actor = await requireRpcRole(context, "FINANCE", "SUPER_ADMIN");
    const playerId = request.playerId?.value;
    if (!playerId) {
      throw new ConnectError("player_id requis", Code.InvalidArgument);
    }
    const amount = request.amount ? Number(request.amount.units) : 0;
    try {
      const result = await initiateTransfer({
        userId: playerId,
        amount,
        destinationReference: request.destinationReference || "",
        idempotencyKey: correlationKey(request.correlationId, `xfer-${playerId}-${amount}`),
        actorUserId: actor.id,
      });
      return { transferId: result.transferId };
    } catch (error) {
      handleUseCaseError(error);
    }
  },

  async getWallet(request, context) {
    const user = await requireRpcUser(context);
    const playerId = request.playerId?.value || user.id;
    if (playerId !== user.id) {
      // Players only read their own wallet via this RPC; finance uses admin REST.
      await requireRpcRole(context, "FINANCE", "SUPER_ADMIN");
    }
    try {
      const wallet = await getMyWallet(playerId);
      const ledger = await listMyLedger(playerId, 0, 20);
      return {
        wallet: {
          walletId: wallet.id,
          playerId: { value: wallet.userId },
          balance: toMoney(wallet.balance, wallet.currency),
          currency: wallet.currency,
        },
        recentEntries: ledger.items.map((entry) => ({
          id: entry.id,
          walletId: wallet.id,
          amount: toMoney(entry.credit > 0 ? entry.credit : entry.debit, wallet.currency),
          balanceAfter: toMoney(entry.balance, wallet.currency),
          direction:
            entry.credit > 0 ? PaymentV1.LedgerDirection.CREDIT : PaymentV1.LedgerDirection.DEBIT,
          type: PaymentV1.LedgerType.ENTRY_FEE,
          description: entry.reason,
          idempotencyKey: "",
          createdAt: toTimestamp(entry.createdAt),
        })),
      };
    } catch (error) {
      handleUseCaseError(error);
    }
  },

  async getPaymentHistory(request, context) {
    const user = await requireRpcUser(context);
    const playerId = request.playerId?.value || user.id;
    if (playerId !== user.id) {
      await requireRpcRole(context, "FINANCE", "SUPER_ADMIN");
    }
    try {
      const pageSize = request.pageSize > 0 ? Math.min(request.pageSize, 100) : 30;
      const payments = await listMyPayments(playerId, 0, pageSize);
      return {
        payments: payments.items.map((p) => ({
          id: p.id,
          playerId: { value: playerId },
          amount: toMoney(p.amount),
          status: toPaymentStatus(p.status),
          provider: p.provider ?? "",
          providerExternalId: p.reference ?? "",
          checkoutUrl: p.checkoutUrl ?? "",
          createdAt: toTimestamp(p.createdAt),
          updatedAt: toTimestamp(p.createdAt),
        })),
        nextPageToken: payments.items.length >= pageSize ? String(payments.skip + pageSize) : "",
      };
    } catch (error) {
      handleUseCaseError(error);
    }
  },
};

/** Explicit export for SEQ-03 composition without touching central router in this lot. */
export function getPaymentServiceHandlers() {
  return paymentService;
}
