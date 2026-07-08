import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => {
  const tx = {
    user: {
      findUnique: vi.fn(),
    },
    wallet: {
      upsert: vi.fn(),
      update: vi.fn(),
    },
    ledgerEntry: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    sessionRegistration: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  };

  return {
    tx,
    prisma: {
      $transaction: vi.fn(),
    },
  };
});

vi.mock("@session-jeu/db", () => ({
  prisma: dbMocks.prisma,
  Prisma: {
    TransactionIsolationLevel: { Serializable: "Serializable" },
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code: string;

      constructor(code: string) {
        super(code);
        this.code = code;
      }
    },
  },
  LedgerDirection: {
    CREDIT: "CREDIT",
    DEBIT: "DEBIT",
  },
  LedgerType: {
    ENTRY_FEE: "ENTRY_FEE",
    PRIZE: "PRIZE",
    REFUND: "REFUND",
    BONUS: "BONUS",
    ADJUSTMENT: "ADJUSTMENT",
  },
  SessionRegistrationStatus: {
    PAYMENT_PENDING: "PAYMENT_PENDING",
    PAID: "PAID",
    EXPIRED: "EXPIRED",
  },
}));

vi.mock("../../queues/registrationExpiration.js", () => ({
  scheduleRegistrationExpiration: vi.fn(),
}));

import { adjustWallet, computeLedgerBalanceXaf, payRegistrationWithWallet } from "../wallet.js";

function wallet(overrides: Record<string, unknown> = {}) {
  const now = new Date("2026-07-08T00:00:00Z");
  return {
    id: "wallet-1",
    userId: "player-1",
    balanceXaf: 1500,
    currency: "XAF",
    isFrozen: false,
    version: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function registration(overrides: Record<string, unknown> = {}) {
  const now = new Date("2026-07-08T00:00:00Z");
  return {
    id: "registration-1",
    userId: "player-1",
    sessionId: "session-1",
    status: "PAYMENT_PENDING",
    paymentDeadlineAt: new Date("2026-07-08T00:15:00Z"),
    paidAt: null,
    cancelledAt: null,
    cancellationReason: null,
    createdAt: now,
    updatedAt: now,
    session: {
      id: "session-1",
      entryFeeXaf: 1000,
    },
    ...overrides,
  };
}

function ledger(overrides: Record<string, unknown> = {}) {
  return {
    id: "ledger-1",
    walletId: "wallet-1",
    userId: "player-1",
    amountXaf: 1000,
    balanceAfterXaf: 500,
    direction: "DEBIT",
    type: "ENTRY_FEE",
    description: "Wallet payment for session registration",
    referenceType: "SessionRegistration",
    referenceId: "registration-1",
    idempotencyKey: "idem-12345678",
    paymentId: null,
    sessionId: "session-1",
    createdAt: new Date("2026-07-08T00:00:00Z"),
    ...overrides,
  };
}

describe("wallet business logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof dbMocks.tx) => unknown) => callback(dbMocks.tx),
    );
    dbMocks.tx.user.findUnique.mockResolvedValue({ id: "player-1" });
    dbMocks.tx.ledgerEntry.findUnique.mockResolvedValue(null);
    dbMocks.tx.ledgerEntry.create.mockResolvedValue(ledger());
    dbMocks.tx.wallet.upsert.mockResolvedValue(wallet());
    dbMocks.tx.wallet.update.mockResolvedValue(wallet({ balanceXaf: 500, version: 2 }));
    dbMocks.tx.sessionRegistration.findUnique.mockResolvedValue(registration());
    dbMocks.tx.sessionRegistration.update.mockResolvedValue(
      registration({ status: "PAID", paidAt: new Date("2026-07-08T00:00:00Z") }),
    );
    dbMocks.tx.auditLog.create.mockResolvedValue({});
  });

  it("recomputes ledger balance from posted credit and debit entries", () => {
    expect(
      computeLedgerBalanceXaf([
        { direction: "CREDIT", amountXaf: 2000 },
        { direction: "DEBIT", amountXaf: 750 },
      ]),
    ).toBe(1250);
  });

  it("debits wallet, writes ledger, and marks registration paid atomically", async () => {
    const result = await payRegistrationWithWallet({
      userId: "player-1",
      registrationId: "registration-1",
      idempotencyKey: "idem-12345678",
      now: new Date("2026-07-08T00:00:00Z"),
    });

    expect(result.type).toBe("ok");
    expect(dbMocks.tx.ledgerEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amountXaf: 1000,
          balanceAfterXaf: 500,
          direction: "DEBIT",
          type: "ENTRY_FEE",
          idempotencyKey: "idem-12345678",
        }),
      }),
    );
    expect(dbMocks.tx.wallet.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ balanceXaf: 500 }) }),
    );
    expect(dbMocks.tx.sessionRegistration.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "PAID" }) }),
    );
  });

  it("does not double debit when idempotency key already exists", async () => {
    dbMocks.tx.ledgerEntry.findUnique.mockResolvedValue({
      ...ledger(),
      wallet: wallet(),
    });

    const result = await payRegistrationWithWallet({
      userId: "player-1",
      registrationId: "registration-1",
      idempotencyKey: "idem-12345678",
      now: new Date("2026-07-08T00:00:00Z"),
    });

    expect(result.type).toBe("idempotent");
    expect(dbMocks.tx.ledgerEntry.create).not.toHaveBeenCalled();
    expect(dbMocks.tx.wallet.update).not.toHaveBeenCalled();
  });

  it("refuses debit when wallet has insufficient funds", async () => {
    dbMocks.tx.wallet.upsert.mockResolvedValue(wallet({ balanceXaf: 100 }));

    const result = await payRegistrationWithWallet({
      userId: "player-1",
      registrationId: "registration-1",
      idempotencyKey: "idem-12345678",
      now: new Date("2026-07-08T00:00:00Z"),
    });

    expect(result.type).toBe("insufficient-funds");
    expect(dbMocks.tx.ledgerEntry.create).not.toHaveBeenCalled();
    expect(dbMocks.tx.sessionRegistration.update).not.toHaveBeenCalled();
  });

  it("credits wallet through admin adjustment with reason and audit", async () => {
    dbMocks.tx.ledgerEntry.create.mockResolvedValue(
      ledger({
        amountXaf: 500,
        balanceAfterXaf: 2000,
        direction: "CREDIT",
        type: "ADJUSTMENT",
      }),
    );
    dbMocks.tx.wallet.update.mockResolvedValue(wallet({ balanceXaf: 2000, version: 2 }));

    const result = await adjustWallet({
      adminUserId: "finance-1",
      targetUserId: "player-1",
      amountXaf: 500,
      direction: "CREDIT",
      type: "ADJUSTMENT",
      reason: "manual correction",
      idempotencyKey: "admin-12345678",
    });

    expect(result.type).toBe("ok");
    expect(dbMocks.tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "finance-1",
          action: "wallet.adjusted",
          reason: "manual correction",
        }),
      }),
    );
  });
});
