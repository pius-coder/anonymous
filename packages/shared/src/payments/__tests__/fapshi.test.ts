import { describe, expect, it } from "vitest";
import { hasVerifiedFapshiSuccessAmount } from "../fapshi.js";

describe("hasVerifiedFapshiSuccessAmount", () => {
  it("requires an exact positive integer amount for successful payments", () => {
    expect(
      hasVerifiedFapshiSuccessAmount({
        status: "SUCCESSFUL",
        expectedAmountXaf: 1000,
        providerAmountXaf: 1000,
      }),
    ).toBe(true);
    expect(
      hasVerifiedFapshiSuccessAmount({
        status: "SUCCESSFUL",
        expectedAmountXaf: 1000,
        providerAmountXaf: undefined,
      }),
    ).toBe(false);
    expect(
      hasVerifiedFapshiSuccessAmount({
        status: "SUCCESSFUL",
        expectedAmountXaf: 1000,
        providerAmountXaf: 999,
      }),
    ).toBe(false);
  });

  it("does not require an amount for non-terminal provider states", () => {
    expect(
      hasVerifiedFapshiSuccessAmount({
        status: "PENDING",
        expectedAmountXaf: 1000,
        providerAmountXaf: undefined,
      }),
    ).toBe(true);
  });
});
