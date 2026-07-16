import { beforeEach, describe, expect, it, vi } from "vitest";
import { PAYMENT_ERRORS } from "@session-jeu/shared";

const dbMocks = vi.hoisted(() => ({
  paymentRepository: {
    findWalletByUserId: vi.fn(),
    createWallet: vi.fn(),
    createWalletDebitPayment: vi.fn(),
    findTransactionById: vi.fn(),
    findTransactionByIdempotencyKey: vi.fn(),
    createPaymentTransaction: vi.fn(),
    updateTransactionStatus: vi.fn(),
    settlePaymentWebhook: vi.fn(),
    findWalletById: vi.fn(),
    listLedgerEntriesByUserId: vi.fn(),
    listTransactionsByWallet: vi.fn(),
    listAllTransactions: vi.fn(),
    countTransactions: vi.fn(),
  },
  auditRepository: {
    createAuditLog: vi.fn(),
  },
}));

vi.mock("@session-jeu/db", () => dbMocks);

const {
  PaymentUseCaseError,
  handlePaymentWebhook,
  payWithWallet,
  initiatePayment,
  assertPrizeCreditAllowed,
  reconcilePayment,
} = await import("../payment.use-case.js");

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.FAPSHI_WEBHOOK_SECRET;
  delete process.env.PAYMENT_ACCESS_FEE_XAF;
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

describe("assertPrizeCreditAllowed", () => {
  it("blocks prize credits before explicit publication", () => {
    expect(() => assertPrizeCreditAllowed()).toThrow(/publication explicite/);
  });
});

describe("initiatePayment", () => {
  it("uses server amount and requires idempotency key", async () => {
    process.env.PAYMENT_ACCESS_FEE_XAF = "2500";
    dbMocks.paymentRepository.findWalletByUserId.mockResolvedValueOnce({
      id: "wallet-1",
      userId: "user-1",
      balance: 0,
      currency: "XAF",
      createdAt: new Date("2026-07-15T10:00:00.000Z"),
    });
    dbMocks.paymentRepository.findTransactionByIdempotencyKey.mockResolvedValueOnce(null);
    dbMocks.paymentRepository.createPaymentTransaction.mockResolvedValueOnce({
      id: "payment-1",
      walletId: "wallet-1",
      amount: 2500,
      type: "ACCESS_FEE",
      provider: "FAPSHI",
      reference: null,
      status: "PENDING",
      createdAt: new Date("2026-07-15T10:00:00.000Z"),
    });
    dbMocks.paymentRepository.updateTransactionStatus.mockResolvedValueOnce({
      id: "payment-1",
      walletId: "wallet-1",
      amount: 2500,
      type: "ACCESS_FEE",
      provider: "FAPSHI",
      reference: "fapshi-local-payment-1",
      status: "PENDING",
      createdAt: new Date("2026-07-15T10:00:00.000Z"),
    });

    const result = await initiatePayment({
      userId: "user-1",
      purpose: "ACCESS_FEE",
      productCode: "UNKNOWN-PARTY",
      requestedAmount: 99_999,
      idempotencyKey: "idem-init-0001",
    });

    expect(dbMocks.paymentRepository.createPaymentTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 2500,
        type: "ACCESS_FEE",
        idempotencyKey: "idem-init-0001",
        status: "PENDING",
      }),
    );
    expect(result.amount).toBe(2500);
    expect(result.status).toBe("PENDING");
    expect(result.checkoutUrl).toContain("payment-1");
  });

  it("returns existing transaction for the same idempotency key", async () => {
    dbMocks.paymentRepository.findWalletByUserId.mockResolvedValueOnce({
      id: "wallet-1",
      userId: "user-1",
      balance: 0,
      currency: "XAF",
      createdAt: new Date("2026-07-15T10:00:00.000Z"),
    });
    dbMocks.paymentRepository.findTransactionByIdempotencyKey.mockResolvedValueOnce({
      id: "payment-1",
      walletId: "wallet-1",
      amount: 2500,
      type: "ACCESS_FEE",
      provider: "FAPSHI",
      reference: "ref-1",
      status: "PENDING",
      createdAt: new Date("2026-07-15T10:00:00.000Z"),
    });

    const result = await initiatePayment({
      userId: "user-1",
      idempotencyKey: "idem-init-0001",
    });

    expect(dbMocks.paymentRepository.createPaymentTransaction).not.toHaveBeenCalled();
    expect(result.id).toBe("payment-1");
  });

  it("rejects short idempotency keys", async () => {
    await expect(
      initiatePayment({ userId: "user-1", idempotencyKey: "short" }),
    ).rejects.toMatchObject({ httpStatus: 400 });
  });
});

describe("payWithWallet", () => {
  it("delegates wallet debit to one transactional repository operation with server amount", async () => {
    process.env.PAYMENT_ACCESS_FEE_XAF = "1500";
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
      reason: "Entry fee",
      idempotencyKey: "idem-wallet-01",
    });

    expect(dbMocks.paymentRepository.createWalletDebitPayment).toHaveBeenCalledWith({
      walletId: "wallet-1",
      amount: 1500,
      reason: "Entry fee",
      idempotencyKey: "idem-wallet-01",
    });
    expect(result.payment).toMatchObject({ id: "payment-1", status: "SUCCESSFUL" });
    expect(result.amount).toBe(1500);
  });

  it("maps insufficient balance to a stable public error", async () => {
    dbMocks.paymentRepository.findWalletByUserId.mockResolvedValueOnce({ id: "wallet-1", userId: "user-1" });
    dbMocks.paymentRepository.createWalletDebitPayment.mockRejectedValueOnce(new Error("INSUFFICIENT_BALANCE"));

    await expect(
      payWithWallet({
        userId: "user-1",
        reason: "Entry fee",
        idempotencyKey: "idem-wallet-02",
      }),
    ).rejects.toMatchObject({
      code: PAYMENT_ERRORS.INSUFFICIENT_BALANCE.code,
      httpStatus: 422,
    });
  });
});

describe("handlePaymentWebhook", () => {
  it("settles a TOP_UP webhook through the idempotent repository operation", async () => {
    dbMocks.paymentRepository.findTransactionById.mockResolvedValueOnce({
      id: "payment-1",
      walletId: "wallet-1",
      amount: 1500,
      type: "TOP_UP",
      provider: "FAPSHI",
      reference: null,
      status: "PENDING",
      createdAt: new Date("2026-07-15T10:00:00.000Z"),
    });
    dbMocks.paymentRepository.settlePaymentWebhook.mockResolvedValueOnce({
      id: "payment-1",
      walletId: "wallet-1",
      amount: 1500,
      type: "TOP_UP",
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

  it("marks ACCESS_FEE successful without wallet credit side effects", async () => {
    dbMocks.paymentRepository.findTransactionById.mockResolvedValueOnce({
      id: "payment-1",
      walletId: "wallet-1",
      amount: 2500,
      type: "ACCESS_FEE",
      provider: "FAPSHI",
      reference: null,
      status: "PENDING",
      createdAt: new Date("2026-07-15T10:00:00.000Z"),
    });
    dbMocks.paymentRepository.updateTransactionStatus.mockResolvedValueOnce({
      id: "payment-1",
      walletId: "wallet-1",
      amount: 2500,
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
    expect(dbMocks.paymentRepository.updateTransactionStatus).toHaveBeenCalledWith(
      "payment-1",
      expect.objectContaining({ status: "SUCCESSFUL" }),
    );
  });

  it("returns terminal transactions without replaying settlement side effects", async () => {
    dbMocks.paymentRepository.findTransactionById.mockResolvedValueOnce({
      id: "payment-1",
      walletId: "wallet-1",
      amount: 1500,
      type: "TOP_UP",
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

  it("rejects invalid webhook signatures when secret is configured", async () => {
    process.env.FAPSHI_WEBHOOK_SECRET = "expected-secret";
    await expect(
      handlePaymentWebhook({
        transactionId: "payment-1",
        status: "SUCCESS",
        providerReference: "ref",
        signature: "wrong",
      }),
    ).rejects.toMatchObject({
      code: PAYMENT_ERRORS.WEBHOOK_SIGNATURE_INVALID.code,
      httpStatus: 401,
    });
  });
});

describe("reconcilePayment", () => {
  it("closes PENDING as FAILED and writes audit metadata", async () => {
    dbMocks.paymentRepository.findTransactionById.mockResolvedValueOnce({
      id: "payment-1",
      walletId: "wallet-1",
      amount: 1000,
      type: "ACCESS_FEE",
      provider: "FAPSHI",
      reference: null,
      status: "PENDING",
      createdAt: new Date("2026-07-15T10:00:00.000Z"),
    });
    dbMocks.paymentRepository.updateTransactionStatus.mockResolvedValueOnce({
      id: "payment-1",
      walletId: "wallet-1",
      amount: 1000,
      type: "ACCESS_FEE",
      provider: "FAPSHI",
      reference: "RECONCILED_BY_ADMIN_admin-1",
      status: "FAILED",
      createdAt: new Date("2026-07-15T10:00:00.000Z"),
    });
    dbMocks.auditRepository.createAuditLog.mockResolvedValueOnce({});

    const result = await reconcilePayment("payment-1", "admin-1", "provider timeout");
    expect(result.status).toBe("FAILED");
    expect(dbMocks.auditRepository.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "PAYMENT_RECONCILE",
        entityId: "payment-1",
      }),
    );
  });
});
