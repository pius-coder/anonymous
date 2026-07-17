import { describe, expect, it } from "vitest";

/** L5: pure URL policy used before navigating to checkout (no DB injection). */
function isOfficialCheckoutUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return host === "fapshi.com" || host.endsWith(".fapshi.com");
  } catch {
    return false;
  }
}

describe("checkout URL policy (L5)", () => {
  it("accepts official Fapshi HTTPS hosts", () => {
    expect(isOfficialCheckoutUrl("https://sandbox.fapshi.com/pay/abc")).toBe(true);
    expect(isOfficialCheckoutUrl("https://live.fapshi.com/pay/xyz")).toBe(true);
  });

  it("rejects non-Fapshi or non-HTTPS targets", () => {
    expect(isOfficialCheckoutUrl("http://sandbox.fapshi.com/pay")).toBe(false);
    expect(isOfficialCheckoutUrl("https://evil.example/pay")).toBe(false);
    expect(isOfficialCheckoutUrl("/payments/checkout/local")).toBe(false);
    expect(isOfficialCheckoutUrl("not-a-url")).toBe(false);
  });
});
