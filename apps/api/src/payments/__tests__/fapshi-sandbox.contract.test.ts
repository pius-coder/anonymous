/**
 * L4 contract tests against real Fapshi sandbox — controlled opt-in.
 * Set FAPSHI_RUN_SANDBOX=1 with sandbox credentials to execute network calls.
 */
import { describe, expect, it } from "vitest";
import { getPaymentStatus, initiatePay, resolveFapshiBaseUrl } from "../fapshi-client.js";

const runSandbox = process.env.FAPSHI_RUN_SANDBOX === "1";

describe.skipIf(!runSandbox)("Fapshi sandbox contract (L4)", () => {
  it("uses sandbox base URL", () => {
    expect(resolveFapshiBaseUrl()).toBe("https://sandbox.fapshi.com");
  });

  it("initiates pay and queries payment-status with official fields", async () => {
    const externalId = `pay_l4_${Date.now()}`;
    const initiated = await initiatePay({
      amount: 100,
      externalId,
      userId: "l4_tester",
      message: "L4 sandbox contract",
    });

    expect(initiated.transId).toMatch(/^[a-zA-Z0-9_-]+$/);
    expect(initiated.link).toMatch(/^https:\/\/(sandbox\.)?fapshi\.com\//i);

    const status = await getPaymentStatus(initiated.transId);
    expect(status.transId).toBe(initiated.transId);
    expect(["CREATED", "PENDING", "SUCCESSFUL", "FAILED", "EXPIRED"]).toContain(status.status);
    if (status.externalId) {
      expect(status.externalId).toBe(externalId);
    }
  });
});
