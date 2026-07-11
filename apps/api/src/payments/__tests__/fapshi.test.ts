import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => {
  const tx = {
    webhookEvent: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    paymentTransaction: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    sessionRegistration: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
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
  PaymentStatus: {
    PENDING: "PENDING",
    SUCCESSFUL: "SUCCESSFUL",
    FAILED: "FAILED",
    EXPIRED: "EXPIRED",
    REFUNDED: "REFUNDED",
  },
  SessionRegistrationStatus: {
    CREATED: "CREATED",
    PAYMENT_PENDING: "PAYMENT_PENDING",
    PAID: "PAID",
    CANCELLED: "CANCELLED",
    REFUNDED: "REFUNDED",
    EXPIRED: "EXPIRED",
  },
}));

vi.mock("../../queues/paymentReconciliation.js", () => ({
  schedulePaymentReconciliation: vi.fn(),
}));

vi.mock("../fapshiClient.js", async () => {
  const actual = await vi.importActual<typeof import("../fapshiClient.js")>("../fapshiClient.js");
  return {
    ...actual,
    initiateFapshiPayment: vi.fn(),
  };
});

import {
  applyFapshiPaymentStatus,
  initiatePaymentForRegistration,
  mapFapshiStatus,
} from "../fapshi.js";
import { initiateFapshiPayment } from "../fapshiClient.js";

function payment(overrides: Record<string, unknown> = {}) {
  const now = new Date("2026-07-08T00:00:00Z");
  return {
    id: "payment-1",
    userId: "player-1",
    sessionId: "session-1",
    registrationId: "registration-1",
    amount: 1000,
    amountXaf: 1000,
    currency: "XAF",
    status: "PENDING",
    provider: "FAPSHI",
    providerExternalId: "external-1",
    providerTransId: "trans-1",
    providerStatus: "CREATED",
    checkoutUrl: "https://checkout.example/pay",
    webhookReceivedAt: null,
    metadata: null,
    createdAt: now,
    updatedAt: now,
    registration: {
      id: "registration-1",
      status: "PAYMENT_PENDING",
    },
    ...overrides,
  };
}

describe("Fapshi payment business logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof dbMocks.tx) => unknown) => callback(dbMocks.tx),
    );
    dbMocks.tx.webhookEvent.findUnique.mockResolvedValue(null);
    dbMocks.tx.webhookEvent.create.mockResolvedValue({ id: "event-1" });
    dbMocks.tx.webhookEvent.update.mockResolvedValue({});
    dbMocks.tx.paymentTransaction.findFirst.mockResolvedValue(payment());
    dbMocks.tx.paymentTransaction.update.mockResolvedValue(payment({ status: "SUCCESSFUL" }));
    dbMocks.tx.sessionRegistration.updateMany.mockResolvedValue({ count: 1 });
    dbMocks.tx.auditLog.create.mockResolvedValue({});
    dbMocks.tx.sessionRegistration.findUnique.mockResolvedValue(null);
  });

  it("maps Fapshi statuses to internal statuses", () => {
    expect(mapFapshiStatus("SUCCESSFUL")).toBe("SUCCESSFUL");
    expect(mapFapshiStatus("FAILED")).toBe("FAILED");
    expect(mapFapshiStatus("EXPIRED")).toBe("EXPIRED");
    expect(mapFapshiStatus("CREATED")).toBe("PENDING");
    expect(mapFapshiStatus("PENDING")).toBe("PENDING");
  });

  it("never overwrites a failed checkout when initiation is requested again", async () => {
    const existingPayment = payment({ status: "FAILED", checkoutUrl: null });
    dbMocks.tx.sessionRegistration.findUnique.mockResolvedValue({
      id: "registration-1",
      userId: "player-1",
      status: "PAYMENT_PENDING",
      paymentDeadlineAt: new Date(Date.now() + 60_000),
      user: { id: "player-1", email: "player@example.com" },
      session: { id: "session-1", name: "Session", entryFeeXaf: 1000 },
      payment: existingPayment,
    });

    const result = await initiatePaymentForRegistration({
      userId: "player-1",
      registrationId: "registration-1",
    });

    expect(result).toEqual({ type: "existing", payment: existingPayment });
    expect(initiateFapshiPayment).not.toHaveBeenCalled();
    expect(dbMocks.tx.paymentTransaction.update).not.toHaveBeenCalled();
  });

  it("marks payment successful and registration paid from webhook payload", async () => {
    const result = await applyFapshiPaymentStatus({
      payload: {
        transId: "trans-1",
        status: "SUCCESSFUL",
        amount: 1000,
        externalId: "external-1",
      },
      now: new Date("2026-07-08T00:01:00Z"),
    });

    expect(result.type).toBe("processed");
    expect(dbMocks.tx.paymentTransaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "SUCCESSFUL", providerStatus: "SUCCESSFUL" }),
      }),
    );
    expect(dbMocks.tx.sessionRegistration.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "registration-1", status: "PAYMENT_PENDING" }),
        data: expect.objectContaining({ status: "PAID", paidAt: expect.any(Date) }),
      }),
    );
  });

  it("does not mark registration paid when provider amount differs", async () => {
    const result = await applyFapshiPaymentStatus({
      payload: {
        transId: "trans-1",
        status: "SUCCESSFUL",
        amount: 500,
        externalId: "external-1",
      },
      now: new Date("2026-07-08T00:01:00Z"),
    });

    expect(result.type).toBe("amount-verification-failed");
    expect(dbMocks.tx.paymentTransaction.update).not.toHaveBeenCalled();
    expect(dbMocks.tx.sessionRegistration.updateMany).not.toHaveBeenCalled();
    expect(dbMocks.tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "payment.amount-verification-failed" }),
      }),
    );
  });

  it("does not mark registration paid when a successful webhook omits the amount", async () => {
    const result = await applyFapshiPaymentStatus({
      payload: {
        transId: "trans-1",
        status: "SUCCESSFUL",
        externalId: "external-1",
      },
    });

    expect(result.type).toBe("amount-verification-failed");
    expect(dbMocks.tx.paymentTransaction.update).not.toHaveBeenCalled();
    expect(dbMocks.tx.sessionRegistration.updateMany).not.toHaveBeenCalled();
  });

  it("does not downgrade an already successful payment", async () => {
    dbMocks.tx.paymentTransaction.findFirst.mockResolvedValue(
      payment({ status: "SUCCESSFUL", registration: { id: "registration-1", status: "PAID" } }),
    );

    const result = await applyFapshiPaymentStatus({
      payload: { transId: "trans-1", status: "FAILED", externalId: "external-1" },
    });

    expect(result.type).toBe("terminal-ignored");
    expect(dbMocks.tx.paymentTransaction.update).not.toHaveBeenCalled();
    expect(dbMocks.tx.sessionRegistration.updateMany).not.toHaveBeenCalled();
  });

  it("treats already processed webhook event as replay", async () => {
    dbMocks.tx.webhookEvent.findUnique.mockResolvedValue({
      id: "event-1",
      processedAt: new Date("2026-07-08T00:00:00Z"),
    });

    const result = await applyFapshiPaymentStatus({
      payload: { transId: "trans-1", status: "SUCCESSFUL" },
    });

    expect(result).toEqual({ type: "replay" });
    expect(dbMocks.tx.paymentTransaction.update).not.toHaveBeenCalled();
  });
});
