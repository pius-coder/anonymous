import { describe, it, expect } from "vitest";
import { reconcilePendingTransactions } from "../jobs/paymentReconciliation.js";

describe("reconcilePendingTransactions", () => {
  it("returns a result object with counts", async () => {
    const result = await reconcilePendingTransactions();
    expect(result).toHaveProperty("processed");
    expect(result).toHaveProperty("failed");
    expect(result).toHaveProperty("errors");
    expect(Array.isArray(result.errors)).toBe(true);
  });
});
