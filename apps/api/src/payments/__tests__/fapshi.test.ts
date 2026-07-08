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
    },
    sessionRegistration: {
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

import { applyFapshiPaymentStatus, mapFapshiStatus } from "../fapshi.js";

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
    dbMocks.tx.sessionRegistration.update.mockResolvedValue({});
    dbMocks.tx.auditLog.create.mockResolvedValue({});
  });

  it("maps Fapshi statuses to internal statuses", () => {
    expect(mapFapshiStatus("SUCCESSFUL")).toBe("SUCCESSFUL");
    expect(mapFapshiStatus("FAILED")).toBe("FAILED");
    expect(mapFapshiStatus("EXPIRED")).toBe("EXPIRED");
    expect(mapFapshiStatus("CREATED")).toBe("PENDING");
    expect(mapFapshiStatus("PENDING")).toBe("PENDING");
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
    expect(dbMocks.tx.sessionRegistration.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "registration-1" },
        data: expect.objectContaining({ status: "PAID", paidAt: expect.any(Date) }),
      }),
    );
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
