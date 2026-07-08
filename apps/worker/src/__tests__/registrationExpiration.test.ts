import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  prisma: {
    sessionRegistration: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@session-jeu/db", () => ({
  prisma: dbMocks.prisma,
  SessionRegistrationStatus: {
    CREATED: "CREATED",
    PAYMENT_PENDING: "PAYMENT_PENDING",
    PAID: "PAID",
    CANCELLED: "CANCELLED",
    REFUNDED: "REFUNDED",
    EXPIRED: "EXPIRED",
  },
}));

import { processRegistrationExpiration } from "../registrationExpiration.js";

function registration(overrides: Record<string, unknown> = {}) {
  return {
    id: "registration-1",
    userId: "player-1",
    sessionId: "session-1",
    status: "PAYMENT_PENDING",
    paymentDeadlineAt: new Date("2026-07-08T00:00:00Z"),
    paidAt: null,
    cancelledAt: null,
    cancellationReason: null,
    createdAt: new Date("2026-07-07T23:45:00Z"),
    updatedAt: new Date("2026-07-07T23:45:00Z"),
    ...overrides,
  };
}

describe("registration expiration worker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.prisma.sessionRegistration.findUnique.mockResolvedValue(registration());
    dbMocks.prisma.sessionRegistration.updateMany.mockResolvedValue({ count: 1 });
    dbMocks.prisma.auditLog.create.mockResolvedValue({});
  });

  it("expires pending registrations after the payment deadline", async () => {
    const result = await processRegistrationExpiration(
      { registrationId: "registration-1" },
      new Date("2026-07-08T00:01:00Z"),
    );

    expect(result).toEqual({ expired: true, registrationId: "registration-1" });
    expect(dbMocks.prisma.sessionRegistration.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "registration-1", status: "PAYMENT_PENDING" },
        data: expect.objectContaining({
          status: "EXPIRED",
          cancellationReason: "payment-deadline-expired",
        }),
      }),
    );
    expect(dbMocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "registration.expired" }),
      }),
    );
  });

  it("does nothing when payment was already confirmed", async () => {
    dbMocks.prisma.sessionRegistration.findUnique.mockResolvedValue(
      registration({ status: "PAID", paidAt: new Date("2026-07-08T00:00:30Z") }),
    );

    const result = await processRegistrationExpiration(
      { registrationId: "registration-1" },
      new Date("2026-07-08T00:01:00Z"),
    );

    expect(result).toEqual({ expired: false, reason: "not-pending" });
    expect(dbMocks.prisma.sessionRegistration.updateMany).not.toHaveBeenCalled();
  });

  it("does nothing before the deadline", async () => {
    const result = await processRegistrationExpiration(
      { registrationId: "registration-1" },
      new Date("2026-07-07T23:59:00Z"),
    );

    expect(result).toEqual({ expired: false, reason: "deadline-not-reached" });
    expect(dbMocks.prisma.sessionRegistration.updateMany).not.toHaveBeenCalled();
  });
});
