import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  prisma: {
    paymentTransaction: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    sessionRegistration: {
      updateMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@session-jeu/db", () => ({
  prisma: dbMocks.prisma,
  Prisma: {},
  PaymentStatus: {
    PENDING: "PENDING",
    SUCCESSFUL: "SUCCESSFUL",
    FAILED: "FAILED",
    EXPIRED: "EXPIRED",
    REFUNDED: "REFUNDED",
  },
  SessionRegistrationStatus: {
    PAYMENT_PENDING: "PAYMENT_PENDING",
    PAID: "PAID",
  },
}));

import { processPaymentReconciliation } from "../paymentReconciliation.js";

function payment(overrides: Record<string, unknown> = {}) {
  return {
    id: "payment-1",
    userId: "player-1",
    providerTransId: "trans-1",
    status: "PENDING",
    amountXaf: 1000,
    webhookReceivedAt: null,
    registration: {
      id: "registration-1",
      status: "PAYMENT_PENDING",
    },
    ...overrides,
  };
}

describe("payment reconciliation worker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.FAPSHI_API_USER = "api-user";
    process.env.FAPSHI_API_KEY = "api-key";
    process.env.FAPSHI_BASE_URL = "https://sandbox.example";
    dbMocks.prisma.paymentTransaction.findUnique.mockResolvedValue(payment());
    dbMocks.prisma.paymentTransaction.updateMany.mockResolvedValue({ count: 1 });
    dbMocks.prisma.sessionRegistration.updateMany.mockResolvedValue({ count: 1 });
    dbMocks.prisma.auditLog.create.mockResolvedValue({});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ transId: "trans-1", status: "SUCCESSFUL", amount: 1000 }),
      }),
    );
  });

  it("reconciles successful provider status and marks registration paid", async () => {
    const result = await processPaymentReconciliation(
      { paymentId: "payment-1" },
      new Date("2026-07-08T00:00:00Z"),
    );

    expect(result).toEqual({
      reconciled: true,
      paymentId: "payment-1",
      status: "SUCCESSFUL",
      registrationPaid: true,
    });
    expect(dbMocks.prisma.sessionRegistration.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "registration-1", status: "PAYMENT_PENDING" }),
        data: expect.objectContaining({ status: "PAID", paidAt: expect.any(Date) }),
      }),
    );
  });

  it("does not settle a successful provider response with a missing amount", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ transId: "trans-1", status: "SUCCESSFUL" }),
      }),
    );

    const result = await processPaymentReconciliation({ paymentId: "payment-1" });

    expect(result).toEqual({ reconciled: false, reason: "amount-verification-failed" });
    expect(dbMocks.prisma.paymentTransaction.updateMany).not.toHaveBeenCalled();
    expect(dbMocks.prisma.sessionRegistration.updateMany).not.toHaveBeenCalled();
  });

  it("does not poll terminal payments", async () => {
    dbMocks.prisma.paymentTransaction.findUnique.mockResolvedValue(
      payment({ status: "SUCCESSFUL" }),
    );

    const result = await processPaymentReconciliation({ paymentId: "payment-1" });

    expect(result).toEqual({ reconciled: false, reason: "payment-terminal" });
    expect(fetch).not.toHaveBeenCalled();
  });
});
