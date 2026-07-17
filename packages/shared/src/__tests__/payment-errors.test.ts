import { describe, it, expect } from "vitest";
import { PAYMENT_ERRORS } from "../payments/errors.js";

describe("PAYMENT_ERRORS", () => {
  it("exports payment error codes", () => {
    expect(PAYMENT_ERRORS.PAYMENT_NOT_FOUND.code).toBe("PAYMENT_NOT_FOUND");
    expect(PAYMENT_ERRORS.PAYMENT_NOT_FOUND.status).toBe(404);
  });

  it("exports insufficient balance error", () => {
    expect(PAYMENT_ERRORS.INSUFFICIENT_BALANCE.code).toBe("INSUFFICIENT_BALANCE");
    expect(PAYMENT_ERRORS.INSUFFICIENT_BALANCE.status).toBe(422);
  });

  it("exports wallet frozen error", () => {
    expect(PAYMENT_ERRORS.WALLET_FROZEN.code).toBe("FAILED_PRECONDITION");
    expect(PAYMENT_ERRORS.WALLET_FROZEN.status).toBe(422);
  });

  it("exports invalid amount error", () => {
    expect(PAYMENT_ERRORS.INVALID_AMOUNT.code).toBe("INVALID_ARGUMENT");
    expect(PAYMENT_ERRORS.INVALID_AMOUNT.status).toBe(400);
  });

  it("has all expected error keys", () => {
    const keys = Object.keys(PAYMENT_ERRORS);
    expect(keys).toContain("PAYMENT_INITIATION_FAILED");
    expect(keys).toContain("PAYMENT_NOT_FOUND");
    expect(keys).toContain("PAYMENT_ALREADY_COMPLETED");
    expect(keys).toContain("PAYMENT_EXPIRED");
    expect(keys).toContain("WALLET_NOT_FOUND");
    expect(keys).toContain("WALLET_FROZEN");
    expect(keys).toContain("INSUFFICIENT_BALANCE");
    expect(keys).toContain("LEDGER_ENTRY_NOT_FOUND");
    expect(keys).toContain("DUPLICATE_IDEMPOTENCY_KEY");
    expect(keys).toContain("INVALID_AMOUNT");
    expect(keys).toContain("PROVIDER_ERROR");
    expect(keys).toContain("WEBHOOK_SIGNATURE_INVALID");
    expect(keys).toContain("PROVIDER_NOT_CONFIGURED");
    expect(keys).toContain("PROVIDER_TIMEOUT_AMBIGUOUS");
    expect(keys).toContain("CHECKOUT_LINK_REJECTED");
    expect(keys).toContain("WEBHOOK_SECRET_REQUIRED");
    expect(keys).toContain("COLLECTION_DISABLED");
  });
});
