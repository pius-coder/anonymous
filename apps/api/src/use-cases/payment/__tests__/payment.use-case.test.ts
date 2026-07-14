import { describe, it, expect } from "vitest";
import { PaymentUseCaseError } from "../payment.use-case.js";

describe("PaymentUseCaseError", () => {
  it("creates error with code and status", () => {
    const err = new PaymentUseCaseError("PAYMENT_NOT_FOUND", "Transaction introuvable", 404);
    expect(err.code).toBe("PAYMENT_NOT_FOUND");
    expect(err.httpStatus).toBe(404);
    expect(err.message).toBe("Transaction introuvable");
    expect(err.name).toBe("PaymentUseCaseError");
  });
});
