import { describe, expect, it } from "vitest";
import {
  assertCheckoutLinkAllowed,
  assertTransId,
  hasVerifiedFapshiSuccessAmount,
  isAllowedFapshiBaseUrl,
  mapFapshiWireToPaymentStatus,
  redactFapshiSecrets,
} from "../payments/fapshi.js";

describe("Fapshi L1 mapping / validation", () => {
  it("verifies SUCCESSFUL amount exactly", () => {
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
        providerAmountXaf: 999,
      }),
    ).toBe(false);
    expect(
      hasVerifiedFapshiSuccessAmount({
        status: "PENDING",
        expectedAmountXaf: 1000,
        providerAmountXaf: undefined,
      }),
    ).toBe(true);
  });

  it("allowlists official base URLs only", () => {
    expect(isAllowedFapshiBaseUrl("https://sandbox.fapshi.com")).toBe(true);
    expect(isAllowedFapshiBaseUrl("https://live.fapshi.com")).toBe(true);
    expect(isAllowedFapshiBaseUrl("https://evil.example")).toBe(false);
  });

  it("rejects checkout links outside Fapshi hosts", () => {
    expect(() => assertCheckoutLinkAllowed("https://evil.example/pay")).toThrow(
      "CHECKOUT_LINK_REJECTED",
    );
    expect(() => assertCheckoutLinkAllowed("http://sandbox.fapshi.com/pay")).toThrow(
      "CHECKOUT_LINK_REJECTED",
    );
    expect(assertCheckoutLinkAllowed("https://sandbox.fapshi.com/pay/abc").hostname).toBe(
      "sandbox.fapshi.com",
    );
  });

  it("validates transId shape", () => {
    expect(assertTransId("tr_abc123")).toBe("tr_abc123");
    expect(() => assertTransId("")).toThrow("PROVIDER_ERROR");
    expect(() => assertTransId("bad id")).toThrow("PROVIDER_ERROR");
  });

  it("maps wire statuses", () => {
    expect(mapFapshiWireToPaymentStatus("SUCCESSFUL")).toBe("SUCCESSFUL");
    expect(mapFapshiWireToPaymentStatus("CREATED")).toBe("CREATED");
    expect(mapFapshiWireToPaymentStatus("EXPIRED")).toBe("EXPIRED");
  });

  it("redacts secrets from log text", () => {
    const redacted = redactFapshiSecrets('apikey=supersecret apiuser:user1 "webhook_secret":"wh"');
    expect(redacted).not.toContain("supersecret");
    expect(redacted).not.toContain("user1");
    expect(redacted).toContain("[REDACTED]");
  });
});
