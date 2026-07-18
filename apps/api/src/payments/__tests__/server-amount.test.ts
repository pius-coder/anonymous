import { afterEach, describe, expect, it } from "vitest";
import { resolveServerAmount } from "../server-amount.js";

afterEach(() => {
  delete process.env.PAYMENT_ACCESS_FEE_XAF;
  delete process.env.PAYMENT_SEED_PARTY_FEE_XAF;
});

describe("resolveServerAmount", () => {
  it("uses catalog for ACCESS_FEE and ignores client amount", () => {
    process.env.PAYMENT_ACCESS_FEE_XAF = "3200";
    expect(
      resolveServerAmount({ purpose: "ACCESS_FEE", requestedAmount: 1 }),
    ).toBe(3200);
  });

  it("uses product code override when present", () => {
    process.env.PAYMENT_SEED_PARTY_FEE_XAF = "1000";
    expect(
      resolveServerAmount({ purpose: "ACCESS_FEE", productCode: "SEED-PARTY-01" }),
    ).toBe(1000);
  });

  it("validates TOP_UP requested amount bounds", () => {
    expect(resolveServerAmount({ purpose: "TOP_UP", requestedAmount: 500 })).toBe(500);
    expect(() => resolveServerAmount({ purpose: "TOP_UP", requestedAmount: 1 })).toThrow(
      "INVALID_AMOUNT",
    );
  });
});
