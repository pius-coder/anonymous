import { describe, expect, it } from "vitest";
import {
  formatXaf,
  mapPaymentStatusLabel,
  paymentApi,
} from "@/services/payment/payment-api";
import { mapPaymentToFinanceRow } from "@/components/finance/finance-data";

describe("payment-api status mapping (L5)", () => {
  it("maps only known server statuses without inventing success", () => {
    expect(mapPaymentStatusLabel("PENDING")).toBe("En attente");
    expect(mapPaymentStatusLabel("SUCCESSFUL")).toBe("Réussi");
    expect(mapPaymentStatusLabel("FAILED")).toBe("Échoué");
    expect(mapPaymentStatusLabel("WEIRD")).toBe("WEIRD");
  });

  it("formats XAF amounts", () => {
    expect(formatXaf(2500)).toContain("2");
    expect(formatXaf(2500)).toContain("FCFA");
  });

  it("builds idempotency keys", () => {
    const key = paymentApi.newIdempotencyKey("test");
    expect(key.startsWith("test-")).toBe(true);
    expect(key.length).toBeGreaterThan(10);
  });

  it("maps finance rows from server payment without fabricating success", () => {
    const row = mapPaymentToFinanceRow({
      id: "pay-1",
      walletId: "wallet-abcdef",
      amount: 1000,
      type: "ACCESS_FEE",
      provider: "FAPSHI",
      reference: "provider-ref-123456",
      status: "PENDING",
      createdAt: "2026-07-15T10:00:00.000Z",
    });
    expect(row.status).toBe("En attente");
    expect(row.reconciliation).toBe("À vérifier");
    expect(row.rawStatus).toBe("PENDING");
  });
});
