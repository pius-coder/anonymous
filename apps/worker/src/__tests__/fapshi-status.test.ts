import { afterEach, describe, expect, it, vi } from "vitest";
import { tryCreateFapshiStatusClient } from "../providers/fapshi-status.js";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe("tryCreateFapshiStatusClient", () => {
  it("returns null when credentials are missing (fail-closed, age-only recon)", () => {
    delete process.env.FAPSHI_API_USER;
    delete process.env.FAPSHI_API_KEY;
    delete process.env.FAPSHI_BASE_URL;
    delete process.env.FAPSHI_ENV;
    expect(tryCreateFapshiStatusClient()).toBeNull();
  });

  it("queries GET /payment-status with apiuser/apikey headers", async () => {
    process.env.FAPSHI_BASE_URL = "https://sandbox.fapshi.com";
    process.env.FAPSHI_API_USER = "u1";
    process.env.FAPSHI_API_KEY = "k1";

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          transId: "tr_abc",
          status: "PENDING",
          amount: 1000,
          externalId: "pay_x",
        }),
        { status: 200 },
      ),
    );

    const client = tryCreateFapshiStatusClient();
    expect(client).not.toBeNull();
    const status = await client!.getPaymentStatus("tr_abc");
    expect(status).toMatchObject({ transId: "tr_abc", status: "PENDING", amount: 1000 });
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://sandbox.fapshi.com/payment-status/tr_abc",
      expect.objectContaining({
        method: "GET",
        headers: { apiuser: "u1", apikey: "k1" },
      }),
    );
  });
});
