import { beforeEach, describe, expect, it, vi } from "vitest";

const txMock = vi.hoisted(() => ({
  wallet: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  paymentTransaction: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  ledgerEntry: {
    create: vi.fn(),
    findUnique: vi.fn(),
  },
}));

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn((callback: (tx: typeof txMock) => unknown) => callback(txMock)),
  wallet: {
    findUnique: vi.fn(),
  },
  paymentTransaction: {
    create: vi.fn(),
    findUnique: vi.fn(),
  },
  ledgerEntry: {
    create: vi.fn(),
    findUnique: vi.fn(),
  },
}));

vi.mock("../prisma.js", () => ({ prisma: prismaMock }));

const paymentRepository = await import("../repositories/payment.repository.js");

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$transaction.mockImplementation((callback: (tx: typeof txMock) => unknown) => callback(txMock));
});

describe("L1 paymentRepository (mocked prisma) idempotency persistence", () => {
  it("stores a unique idempotency key on payment transactions", async () => {
    prismaMock.paymentTransaction.create.mockResolvedValueOnce({ id: "payment-1" });

    await paymentRepository.createPaymentTransaction({
      walletId: "wallet-1",
      amount: 1500,
      type: "ACCESS_FEE",
      provider: "WALLET",
      reference: "provider-reference",
      idempotencyKey: "idem-payment-1",
      status: "SUCCESSFUL",
    });

    expect(prismaMock.paymentTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        walletId: "wallet-1",
        amount: 1500,
        type: "ACCESS_FEE",
        provider: "WALLET",
        reference: "provider-reference",
        idempotencyKey: "idem-payment-1",
        status: "SUCCESSFUL",
        currency: "XAF",
        serviceKind: "COLLECTION",
      }),
    });
  });

  it("looks up payment transactions by durable idempotency key", async () => {
    prismaMock.paymentTransaction.findUnique.mockResolvedValueOnce({ id: "payment-1" });

    await paymentRepository.findTransactionByIdempotencyKey("idem-payment-1");

    expect(prismaMock.paymentTransaction.findUnique).toHaveBeenCalledWith({
      where: { idempotencyKey: "idem-payment-1" },
    });
  });

  it("stores a unique idempotency key on ledger entries", async () => {
    prismaMock.ledgerEntry.create.mockResolvedValueOnce({ id: "ledger-1" });

    await paymentRepository.createLedgerEntryFull({
      transactionId: "payment-1",
      debit: 1500,
      credit: 0,
      balance: 3500,
      reason: "Entry fee",
      idempotencyKey: "idem-ledger-1",
    });

    expect(prismaMock.ledgerEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        transactionId: "payment-1",
        debit: 1500,
        credit: 0,
        balance: 3500,
        balanceAfter: 3500,
        reason: "Entry fee",
        idempotencyKey: "idem-ledger-1",
      }),
    });
  });

  it("looks up ledger entries by durable idempotency key", async () => {
    prismaMock.ledgerEntry.findUnique.mockResolvedValueOnce({ id: "ledger-1" });

    await paymentRepository.findLedgerEntryByIdempotencyKey("idem-ledger-1");

    expect(prismaMock.ledgerEntry.findUnique).toHaveBeenCalledWith({
      where: { idempotencyKey: "idem-ledger-1" },
    });
  });
});

describe("paymentRepository transactional finance operations", () => {
  it("creates wallet debit payment, balance update and ledger in one serializable transaction", async () => {
    txMock.paymentTransaction.findUnique.mockResolvedValueOnce(null);
    txMock.wallet.findUnique.mockResolvedValueOnce({
      id: "wallet-1",
      balance: 5000,
      isFrozen: false,
      userId: "user-1",
    });
    txMock.paymentTransaction.create.mockResolvedValueOnce({ id: "payment-1", amount: 1500 });
    txMock.wallet.update.mockResolvedValueOnce({ id: "wallet-1", balance: 3500 });
    txMock.ledgerEntry.create.mockResolvedValueOnce({ id: "ledger-1" });

    await paymentRepository.createWalletDebitPayment({
      walletId: "wallet-1",
      amount: 1500,
      reason: "Entry fee",
      idempotencyKey: "idem-payment-1",
    });

    expect(prismaMock.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    });
    expect(txMock.paymentTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        walletId: "wallet-1",
        amount: 1500,
        provider: "WALLET",
        status: "SUCCESSFUL",
        idempotencyKey: "idem-payment-1",
      }),
    });
    expect(txMock.wallet.update).toHaveBeenCalledWith({
      where: { id: "wallet-1" },
      data: { balance: { decrement: 1500 }, version: { increment: 1 } },
    });
    expect(txMock.ledgerEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        transactionId: "payment-1",
        debit: 1500,
        credit: 0,
        balance: 3500,
        idempotencyKey: "idem-payment-1",
      }),
    });
  });

  it("replays wallet debit idempotently without a second debit", async () => {
    txMock.paymentTransaction.findUnique.mockResolvedValueOnce({
      id: "payment-1",
      ledgerEntry: { id: "ledger-1" },
    });

    const result = await paymentRepository.createWalletDebitPayment({
      walletId: "wallet-1",
      amount: 1500,
      reason: "Entry fee",
      idempotencyKey: "idem-payment-1",
    });

    expect(result).toMatchObject({
      transaction: { id: "payment-1" },
      ledger: { id: "ledger-1" },
    });
    expect(txMock.wallet.update).not.toHaveBeenCalled();
    expect(txMock.ledgerEntry.create).not.toHaveBeenCalled();
  });

  it("rejects insufficient wallet balance before creating a transaction", async () => {
    txMock.paymentTransaction.findUnique.mockResolvedValueOnce(null);
    txMock.wallet.findUnique.mockResolvedValueOnce({
      id: "wallet-1",
      balance: 100,
      isFrozen: false,
      userId: "user-1",
    });

    await expect(paymentRepository.createWalletDebitPayment({
      walletId: "wallet-1",
      amount: 1500,
      reason: "Entry fee",
      idempotencyKey: "idem-payment-1",
    })).rejects.toThrow("INSUFFICIENT_BALANCE");

    expect(txMock.paymentTransaction.create).not.toHaveBeenCalled();
    expect(txMock.wallet.update).not.toHaveBeenCalled();
  });

  it("settles an external payment and writes one credit ledger entry inside the same transaction", async () => {
    txMock.paymentTransaction.findUnique.mockResolvedValueOnce({
      id: "payment-1",
      walletId: "wallet-1",
      amount: 1500,
      type: "ACCESS_FEE",
      status: "PENDING",
      ledgerEntry: null,
    });
    txMock.paymentTransaction.update.mockResolvedValueOnce({ id: "payment-1", status: "SUCCESSFUL" });
    txMock.wallet.update.mockResolvedValueOnce({ id: "wallet-1", balance: 6500 });
    txMock.ledgerEntry.create.mockResolvedValueOnce({ id: "ledger-1" });

    await paymentRepository.settlePaymentWebhook({
      transactionId: "payment-1",
      status: "SUCCESSFUL",
      providerReference: "provider-ref",
    });

    expect(txMock.paymentTransaction.update).toHaveBeenCalledWith({
      where: { id: "payment-1" },
      data: expect.objectContaining({
        status: "SUCCESSFUL",
        reference: "provider-ref",
        internalStatus: "SUCCEEDED",
      }),
    });
    expect(txMock.wallet.update).toHaveBeenCalledWith({
      where: { id: "wallet-1" },
      data: { balance: { increment: 1500 }, version: { increment: 1 } },
    });
    expect(txMock.ledgerEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        transactionId: "payment-1",
        debit: 0,
        credit: 1500,
        balance: 6500,
      }),
    });
  });

  it("does not write a second ledger entry when a successful webhook is replayed", async () => {
    txMock.paymentTransaction.findUnique.mockResolvedValueOnce({
      id: "payment-1",
      status: "SUCCESSFUL",
      ledgerEntry: { id: "ledger-1" },
    });

    await paymentRepository.settlePaymentWebhook({
      transactionId: "payment-1",
      status: "SUCCESSFUL",
      providerReference: "provider-ref",
    });

    expect(txMock.paymentTransaction.update).not.toHaveBeenCalled();
    expect(txMock.wallet.update).not.toHaveBeenCalled();
    expect(txMock.ledgerEntry.create).not.toHaveBeenCalled();
  });
});
