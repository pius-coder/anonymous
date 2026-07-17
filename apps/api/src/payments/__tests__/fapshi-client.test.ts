import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FapshiClientError,
  getCollectionCredentials,
  initiatePay,
  resolveFapshiBaseUrl,
} from "../fapshi-client.js";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe("fapshi-client L1", () => {
  it("allowlists official base URLs only", () => {
    process.env.FAPSHI_BASE_URL = "https://sandbox.fapshi.com";
    expect(resolveFapshiBaseUrl()).toBe("https://sandbox.fapshi.com");
    process.env.FAPSHI_BASE_URL = "https://evil.example";
    expect(() => resolveFapshiBaseUrl()).toThrow(FapshiClientError);
  });

  it("requires apiuser/apikey", () => {
    delete process.env.FAPSHI_API_USER;
    delete process.env.FAPSHI_API_KEY;
    expect(() => getCollectionCredentials()).toThrow(/FAPSHI_API_USER/);
  });

  it("posts /initiate-pay with apiuser/apikey headers (not Bearer)", async () => {
    process.env.FAPSHI_BASE_URL = "https://sandbox.fapshi.com";
    process.env.FAPSHI_API_USER = "user-1";
    process.env.FAPSHI_API_KEY = "key-1";
    process.env.FAPSHI_COLLECTION_ENABLED = "1";

    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      const headers = init?.headers as Record<string, string>;
      expect(headers.apiuser).toBe("user-1");
      expect(headers.apikey).toBe("key-1");
      expect(headers.Authorization).toBeUndefined();
      expect(String(init?.body)).not.toMatch(/Bearer/);
      expect(_url).toBe("https://sandbox.fapshi.com/initiate-pay");
      return new Response(
        JSON.stringify({
          message: "ok",
          link: "https://sandbox.fapshi.com/pay/xyz",
          transId: "tr_xyz123",
        }),
        { status: 200 },
      );
    });

    const result = await initiatePay(
      { amount: 1000, externalId: "pay_abc", userId: "user_1" },
      { fetchImpl: fetchImpl as unknown as typeof fetch },
    );

    expect(result.transId).toBe("tr_xyz123");
    expect(result.link).toContain("sandbox.fapshi.com");
  });

  it("rejects malformed initiate response without inventing success", async () => {
    process.env.FAPSHI_BASE_URL = "https://sandbox.fapshi.com";
    process.env.FAPSHI_API_USER = "user-1";
    process.env.FAPSHI_API_KEY = "key-1";

    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ checkoutUrl: "https://evil/x", reference: "r" }), {
        status: 200,
      }),
    );

    await expect(
      initiatePay({ amount: 1000 }, { fetchImpl: fetchImpl as unknown as typeof fetch }),
    ).rejects.toMatchObject({ code: "PROVIDER_ERROR" });
  });

  it("rejects checkout link outside allowlisted hosts", async () => {
    process.env.FAPSHI_BASE_URL = "https://sandbox.fapshi.com";
    process.env.FAPSHI_API_USER = "user-1";
    process.env.FAPSHI_API_KEY = "key-1";

    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          link: "https://evil.example/pay",
          transId: "tr_ok",
        }),
        { status: 200 },
      ),
    );

    await expect(
      initiatePay({ amount: 1000 }, { fetchImpl: fetchImpl as unknown as typeof fetch }),
    ).rejects.toThrow();
  });

  it("honors kill switch", async () => {
    process.env.FAPSHI_COLLECTION_ENABLED = "0";
    process.env.FAPSHI_BASE_URL = "https://sandbox.fapshi.com";
    process.env.FAPSHI_API_USER = "u";
    process.env.FAPSHI_API_KEY = "k";
    await expect(initiatePay({ amount: 1000 })).rejects.toMatchObject({
      code: "COLLECTION_DISABLED",
    });
  });
});
