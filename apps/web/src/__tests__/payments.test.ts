import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("payment status UI", () => {
  it("handles Fapshi initiate failures without showing a pending checkout timer", () => {
    const source = readFileSync("src/app/(arena)/payments/[id]/status/page.tsx", "utf-8");

    expect(source).toContain("INITIATE_FAILED");
    expect(source).toContain("Prestataire indisponible");
    expect(source).toContain("createdAt");
    expect(source).toContain("const PAYMENT_DEADLINE_MS = 15 * 60 * 1000");
    expect(source).toContain("Ton inscription sera annulée");
    expect(source).not.toContain("Ton inscription restera en attente");
  });

  it("preserves structured backend payment error codes in server services", () => {
    const source = readFileSync("src/services/api/BaseApiService.ts", "utf-8");

    expect(source).toContain("ApiError.fromResponse");
    expect(source).not.toContain('throw new ApiError("HTTP_ERROR", errorMessage');
  });
});
