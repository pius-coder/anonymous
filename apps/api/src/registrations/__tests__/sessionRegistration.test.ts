import { describe, expect, it, vi } from "vitest";

vi.mock("@session-jeu/db", () => ({
  prisma: {},
  Prisma: {
    TransactionIsolationLevel: { Serializable: "Serializable" },
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code: string;

      constructor(_message: string, options: { code: string }) {
        super(_message);
        this.code = options.code;
      }
    },
  },
  GameSessionStatus: {
    ACTIVE: "ACTIVE",
    CANCELLED: "CANCELLED",
  },
  SessionRegistrationStatus: {
    CREATED: "CREATED",
    PAYMENT_PENDING: "PAYMENT_PENDING",
    PAID: "PAID",
    CHECKED_IN: "CHECKED_IN",
    IN_ROOM: "IN_ROOM",
    NO_SHOW: "NO_SHOW",
    CANCELLED: "CANCELLED",
    REFUNDED: "REFUNDED",
    EXPIRED: "EXPIRED",
  },
}));

vi.mock("../../queues/registrationExpiration.js", () => ({
  scheduleRegistrationExpiration: vi.fn(),
}));

import {
  activeRegistrationStatuses,
  capacityHoldingRegistrationStatuses,
  withSerializableRetry,
} from "../sessionRegistration.js";
import { Prisma } from "@session-jeu/db";

describe("session registration policy", () => {
  it("defines active and capacity-holding statuses explicitly", () => {
    expect(activeRegistrationStatuses).toEqual([
      "CREATED",
      "PAYMENT_PENDING",
      "PAID",
      "CHECKED_IN",
      "IN_ROOM",
    ]);
    expect(capacityHoldingRegistrationStatuses).toEqual([
      "PAYMENT_PENDING",
      "PAID",
      "CHECKED_IN",
      "IN_ROOM",
    ]);
  });

  it("retries serializable transaction conflicts", async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError("conflict", { code: "P2034" }),
      )
      .mockResolvedValueOnce("ok");

    await expect(withSerializableRetry(operation)).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(2);
  });
});
