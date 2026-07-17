import { beforeEach, describe, expect, it, vi } from "vitest";
import { PAYMENT_ERRORS } from "@session-jeu/shared";

const dbMocks = vi.hoisted(() => ({
  paymentRepository: {
    findWalletByUserId: vi.fn(),
    createWallet: vi.fn(),
    createWalletDebitPayment: vi.fn(),
    findTransactionById: vi.fn(),
    findTransactionByIdempotencyKey: vi.fn(),
    findTransactionByProviderTransId: vi.fn(),
    findTransactionByProviderExternalId: vi.fn(),
    createPaymentTransaction: vi.fn(),
    updateTransactionStatus: vi.fn(),
    settlePaymentWebhook: vi.fn(),
    ingestProviderWebhook: vi.fn(),
    applyWebhookSettlement: vi.fn(),
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

const providerMocks = vi.hoisted(() => ({
  initiateExternalCheckout: vi.fn(),
  generateProviderExternalId: vi.fn(() => "pay_testexternalid01"),
  verifyWebhookSecret: vi.fn((header: string | undefined, secret: string | undefined) => {
    if (!secret) return false;
    return header === secret;
  }),
}));

const collectionMocks = vi.hoisted(() => ({
  fetchVerifiedProviderStatus: vi.fn(),
  assertSettlementMatch: vi.fn(),
  parseFapshiWebhookPayload: vi.fn((body: Record<string, unknown>) => ({
    transId: body.transId as string,
    status: body.status as string,
    amount: body.amount as number | undefined,
    externalId: body.externalId as string | undefined,
    userId: body.userId as string | undefined,
  })),
  redactedWebhookSummary: vi.fn(() => "status=SUCCESSFUL"),
  webhookEventId: vi.fn((t: string, s: string) => `fapshi:${t}:${s}`),
}));

vi.mock("@session-jeu/db", () => dbMocks);
vi.mock("../../../payments/provider-adapter.js", () => providerMocks);
vi.mock("../../../payments/fapshi-collection.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../payments/fapshi-collection.js")>();
  return {
    ...actual,
    ...collectionMocks,
    parseFapshiWebhookPayload: collectionMocks.parseFapshiWebhookPayload,
  };
});

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
  providerMocks.generateProviderExternalId.mockReturnValue("pay_testexternalid01");
  providerMocks.verifyWebhookSecret.mockImplementation(
    (header: string | undefined, secret: string | undefined) => {
      if (!secret) return false;
      return header === secret;
    },
  );
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
  it("uses server amount, durable externalId, and official checkout", async () => {
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
      userId: "user-1",
      amount: 2500,
      type: "ACCESS_FEE",
      provider: "FAPSHI",
      reference: null,
      status: "PENDING",
      providerExternalId: "pay_testexternalid01",
      providerTransId: null,
      checkoutUrl: null,
      createdAt: new Date("2026-07-15T10:00:00.000Z"),
    });
    providerMocks.initiateExternalCheckout.mockResolvedValueOnce({
      checkoutUrl: "https://sandbox.fapshi.com/pay/abc",
      providerTransId: "tr_abc",
      providerExternalId: "pay_testexternalid01",
      provider: "FAPSHI",
      wireStatus: "CREATED",
    });
    dbMocks.paymentRepository.updateTransactionStatus.mockResolvedValueOnce({
      id: "payment-1",
      walletId: "wallet-1",
      userId: "user-1",
      amount: 2500,
      type: "ACCESS_FEE",
      provider: "FAPSHI",
      reference: "tr_abc",
      status: "PENDING",
      providerExternalId: "pay_testexternalid01",
      providerTransId: "tr_abc",
      checkoutUrl: "https://sandbox.fapshi.com/pay/abc",
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
        providerExternalId: "pay_testexternalid01",
      }),
    );
    expect(providerMocks.initiateExternalCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        externalId: "pay_testexternalid01",
        amount: 2500,
        paymentId: "payment-1",
      }),
    );
    expect(result.amount).toBe(2500);
    expect(result.status).toBe("PENDING");
    expect(result.checkoutUrl).toBe("https://sandbox.fapshi.com/pay/abc");
    expect(result.checkoutUrl).not.toMatch(/fapshi-local/);
  });

  it("returns existing transaction for the same idempotency key without re-initiate", async () => {
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
      checkoutUrl: "https://sandbox.fapshi.com/pay/x",
      createdAt: new Date("2026-07-15T10:00:00.000Z"),
    });

    const result = await initiatePayment({
      userId: "user-1",
      idempotencyKey: "idem-init-0001",
    });

    expect(dbMocks.paymentRepository.createPaymentTransaction).not.toHaveBeenCalled();
    expect(providerMocks.initiateExternalCheckout).not.toHaveBeenCalled();
    expect(result.id).toBe("payment-1");
  });

  it("rejects short idempotency keys", async () => {
    await expect(
      initiatePayment({ userId: "user-1", idempotencyKey: "short" }),
    ).rejects.toMatchObject({ httpStatus: 400 });
  });

  it("fails closed when provider not configured", async () => {
    process.env.PAYMENT_ACCESS_FEE_XAF = "2500";
    dbMocks.paymentRepository.findWalletByUserId.mockResolvedValueOnce({
      id: "wallet-1",
      userId: "user-1",
      balance: 0,
      currency: "XAF",
      createdAt: new Date(),
    });
    dbMocks.paymentRepository.findTransactionByIdempotencyKey.mockResolvedValueOnce(null);
    dbMocks.paymentRepository.createPaymentTransaction.mockResolvedValueOnce({
      id: "payment-1",
      walletId: "wallet-1",
      amount: 2500,
      type: "ACCESS_FEE",
      provider: "FAPSHI",
      status: "PENDING",
      providerTransId: null,
      checkoutUrl: null,
      createdAt: new Date(),
    });
    const err = new Error("PROVIDER_NOT_CONFIGURED");
    (err as Error & { code?: string }).code = "PROVIDER_NOT_CONFIGURED";
    providerMocks.initiateExternalCheckout.mockRejectedValueOnce(err);
    dbMocks.paymentRepository.updateTransactionStatus.mockResolvedValue({});

    await expect(
      initiatePayment({ userId: "user-1", idempotencyKey: "idem-init-0002" }),
    ).rejects.toMatchObject({
      code: PAYMENT_ERRORS.PROVIDER_NOT_CONFIGURED.code,
      httpStatus: 503,
    });
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
  it("requires webhook secret (fail-closed)", async () => {
    await expect(
      handlePaymentWebhook({
        webhookSecretHeader: "x",
        body: { transId: "tr1", status: "SUCCESSFUL" },
      }),
    ).rejects.toMatchObject({
      code: PAYMENT_ERRORS.WEBHOOK_SECRET_REQUIRED.code,
    });
  });

  it("rejects invalid x-wh-secret without settling", async () => {
    process.env.FAPSHI_WEBHOOK_SECRET = "expected-secret";
    await expect(
      handlePaymentWebhook({
        webhookSecretHeader: "wrong",
        body: { transId: "tr1", status: "SUCCESSFUL" },
      }),
    ).rejects.toMatchObject({
      code: PAYMENT_ERRORS.WEBHOOK_SIGNATURE_INVALID.code,
      httpStatus: 401,
    });
    expect(dbMocks.paymentRepository.ingestProviderWebhook).not.toHaveBeenCalled();
    expect(dbMocks.paymentRepository.applyWebhookSettlement).not.toHaveBeenCalled();
  });

  it("ingests durable inbox and does not settle on webhook body alone (async)", async () => {
    process.env.FAPSHI_WEBHOOK_SECRET = "expected-secret";
    dbMocks.paymentRepository.findTransactionByProviderTransId.mockResolvedValueOnce({
      id: "payment-1",
      amount: 1500,
      type: "TOP_UP",
      status: "PENDING",
      providerExternalId: "pay_ext",
      userId: "user-1",
    });
    dbMocks.paymentRepository.ingestProviderWebhook.mockResolvedValueOnce({
      inbox: { id: "inbox-1" },
      duplicate: false,
    });

    const result = await handlePaymentWebhook({
      webhookSecretHeader: "expected-secret",
      body: { transId: "tr_1", status: "SUCCESSFUL", amount: 1500, externalId: "pay_ext" },
      processSync: false,
    });

    expect(result).toMatchObject({ received: true, inboxId: "inbox-1", duplicate: false });
    expect(dbMocks.paymentRepository.ingestProviderWebhook).toHaveBeenCalled();
    // Settlement only after payment-status — not called synchronously on async path before microtask
    expect(dbMocks.paymentRepository.settlePaymentWebhook).not.toHaveBeenCalled();
  });

  it("dedupes duplicate webhook events", async () => {
    process.env.FAPSHI_WEBHOOK_SECRET = "expected-secret";
    dbMocks.paymentRepository.findTransactionByProviderTransId.mockResolvedValueOnce({
      id: "payment-1",
      amount: 1500,
      status: "PENDING",
    });
    dbMocks.paymentRepository.ingestProviderWebhook.mockResolvedValueOnce({
      inbox: { id: "inbox-1" },
      duplicate: true,
    });

    const result = await handlePaymentWebhook({
      webhookSecretHeader: "expected-secret",
      body: { transId: "tr_1", status: "SUCCESSFUL" },
    });

    expect(result.duplicate).toBe(true);
    expect(dbMocks.paymentRepository.applyWebhookSettlement).not.toHaveBeenCalled();
  });

  it("processSync verifies payment-status before applyWebhookSettlement", async () => {
    process.env.FAPSHI_WEBHOOK_SECRET = "expected-secret";
    dbMocks.paymentRepository.findTransactionByProviderTransId.mockResolvedValue({
      id: "payment-1",
      amount: 1500,
      type: "ACCESS_FEE",
      status: "PENDING",
      providerExternalId: "pay_ext",
      userId: "user-1",
      createdAt: new Date(),
      walletId: "wallet-1",
      provider: "FAPSHI",
      reference: null,
    });
    dbMocks.paymentRepository.findTransactionById.mockResolvedValue({
      id: "payment-1",
      amount: 1500,
      type: "ACCESS_FEE",
      status: "PENDING",
      providerExternalId: "pay_ext",
      userId: "user-1",
      createdAt: new Date(),
      walletId: "wallet-1",
      provider: "FAPSHI",
      reference: null,
    });
    dbMocks.paymentRepository.ingestProviderWebhook.mockResolvedValueOnce({
      inbox: { id: "inbox-1" },
      duplicate: false,
    });
    collectionMocks.fetchVerifiedProviderStatus.mockResolvedValueOnce({
      transId: "tr_1",
      status: "SUCCESSFUL",
      amount: 1500,
      externalId: "pay_ext",
      userId: "user-1",
    });
    dbMocks.paymentRepository.applyWebhookSettlement.mockResolvedValueOnce({
      payment: {
        id: "payment-1",
        amount: 1500,
        type: "ACCESS_FEE",
        status: "SUCCESSFUL",
        walletId: "wallet-1",
        provider: "FAPSHI",
        reference: null,
        createdAt: new Date(),
      },
      applied: true,
    });

    const result = await handlePaymentWebhook({
      webhookSecretHeader: "expected-secret",
      body: { transId: "tr_1", status: "SUCCESSFUL", amount: 1500 },
      processSync: true,
    });

    expect(result.received).toBe(true);
    expect(collectionMocks.fetchVerifiedProviderStatus).toHaveBeenCalledWith("tr_1");
    expect(dbMocks.paymentRepository.applyWebhookSettlement).toHaveBeenCalledWith(
      expect.objectContaining({
        inboxId: "inbox-1",
        transactionId: "payment-1",
        wireStatus: "SUCCESSFUL",
      }),
    );
  });
});

describe("reconcilePayment", () => {
  it("closes PENDING as FAILED and writes audit metadata when no provider path", async () => {
    dbMocks.paymentRepository.findTransactionById.mockResolvedValue({
      id: "payment-1",
      walletId: "wallet-1",
      amount: 1000,
      type: "ACCESS_FEE",
      provider: "FAPSHI",
      reference: null,
      status: "PENDING",
      providerTransId: null,
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
