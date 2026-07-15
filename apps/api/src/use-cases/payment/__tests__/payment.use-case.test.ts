import { beforeEach, describe, expect, it, vi } from "vitest";
import { PAYMENT_ERRORS } from "@session-jeu/shared";

const dbMocks = vi.hoisted(() => ({
  paymentRepository: {
    findWalletByUserId: vi.fn(),
    createWalletDebitPayment: vi.fn(),
    findTransactionById: vi.fn(),
    settlePaymentWebhook: vi.fn(),
  },
}));

vi.mock("@session-jeu/db", () => dbMocks);

const {
  PaymentUseCaseError,
  handlePaymentWebhook,
  payWithWallet,
} = await import("../payment.use-case.js");

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.FAPSHI_WEBHOOK_SECRET;
});

describe("PaymentUseCaseError", () => {
  it("creates error with code and status", () => {
    const err = new PaymentUseCaseError("PAYMENT_NOT_FOUND", "Transaction introuvable", 404);
    expect(err.code).toBe("PAYMENT_NOT_FOUND");
    expect(err.httpStatus).toBe(404);
    expect(err.message).toBe("Transaction introuvable");
    expect(err.name).toBe("PaymentUseCaseError");
  });
});

describe("payWithWallet", () => {
  it("delegates wallet debit to one transactional repository operation", async () => {
    dbMocks.paymentRepository.findWalletByUserId.mockResolvedValueOnce({ id: "wallet-1", userId: "user-1" });
    dbMocks.paymentRepository.createWalletDebitPayment.mockResolvedValueOnce({
      transaction: {
        id: "payment-1",
        walletId: "wallet-1",
        amount: 1500,
        type: "ACCESS_FEE",
        provider: "WALLET",
        reference: "idem-1",
        status: "SUCCESSFUL",
        createdAt: new Date("2026-07-15T10:00:00.000Z"),
      },
      ledger: {
        id: "ledger-1",
        transactionId: "payment-1",
        debit: 1500,
        credit: 0,
        balance: 3500,
        reason: "Entry fee",
        createdAt: new Date("2026-07-15T10:00:00.000Z"),
      },
    });

    const result = await payWithWallet({
      userId: "user-1",
      amount: 1500,
      reason: "Entry fee",
      idempotencyKey: "idem-1",
    });

    expect(dbMocks.paymentRepository.createWalletDebitPayment).toHaveBeenCalledWith({
      walletId: "wallet-1",
      amount: 1500,
      reason: "Entry fee",
      idempotencyKey: "idem-1",
    });
    expect(result.payment).toMatchObject({ id: "payment-1", status: "SUCCESSFUL" });
    expect(result.ledger).toMatchObject({ id: "ledger-1", balance: 3500 });
  });

  it("maps insufficient balance to a stable public error", async () => {
    dbMocks.paymentRepository.findWalletByUserId.mockResolvedValueOnce({ id: "wallet-1", userId: "user-1" });
    dbMocks.paymentRepository.createWalletDebitPayment.mockRejectedValueOnce(new Error("INSUFFICIENT_BALANCE"));

    await expect(payWithWallet({
      userId: "user-1",
      amount: 1500,
      reason: "Entry fee",
    })).rejects.toMatchObject({
      code: PAYMENT_ERRORS.INSUFFICIENT_BALANCE.code,
      httpStatus: 422,
    });
  });
});

describe("handlePaymentWebhook", () => {
  it("settles a provider webhook through the idempotent repository operation", async () => {
    dbMocks.paymentRepository.findTransactionById.mockResolvedValueOnce({
      id: "payment-1",
      walletId: "wallet-1",
      amount: 1500,
      type: "ACCESS_FEE",
      provider: "FAPSHI",
      reference: null,
      status: "PENDING",
      createdAt: new Date("2026-07-15T10:00:00.000Z"),
    });
    dbMocks.paymentRepository.settlePaymentWebhook.mockResolvedValueOnce({
      id: "payment-1",
      walletId: "wallet-1",
      amount: 1500,
      type: "ACCESS_FEE",
      provider: "FAPSHI",
      reference: "provider-ref",
      status: "SUCCESSFUL",
      createdAt: new Date("2026-07-15T10:00:00.000Z"),
    });

    const result = await handlePaymentWebhook({
      transactionId: "payment-1",
      status: "SUCCESS",
      providerReference: "provider-ref",
      signature: "valid",
    });

    expect(dbMocks.paymentRepository.settlePaymentWebhook).toHaveBeenCalledWith({
      transactionId: "payment-1",
      status: "SUCCESSFUL",
      providerReference: "provider-ref",
    });
    expect(result).toMatchObject({ id: "payment-1", status: "SUCCESSFUL" });
  });

  it("returns terminal transactions without replaying settlement side effects", async () => {
    dbMocks.paymentRepository.findTransactionById.mockResolvedValueOnce({
      id: "payment-1",
      walletId: "wallet-1",
      amount: 1500,
      type: "ACCESS_FEE",
      provider: "FAPSHI",
      reference: "provider-ref",
      status: "SUCCESSFUL",
      createdAt: new Date("2026-07-15T10:00:00.000Z"),
    });

    await handlePaymentWebhook({
      transactionId: "payment-1",
      status: "SUCCESS",
      providerReference: "provider-ref",
      signature: "valid",
    });

    expect(dbMocks.paymentRepository.settlePaymentWebhook).not.toHaveBeenCalled();
  });
});
