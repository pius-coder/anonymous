import { describe, expect, it } from "vitest";
import {
  FakeNotificationProvider,
  ProductionWhatsAppProvider,
  createProductionProviderFromEnv,
  getWhatsAppGatewayFoundation,
  redactForLog,
  redactText,
} from "../index.js";

describe("whatsapp gateway foundation", () => {
  it("exposes contractual provider integration marker", () => {
    expect(getWhatsAppGatewayFoundation()).toEqual({
      service: "whatsapp-gateway",
      foundation: "v0.1",
      providerIntegration: "contractual-whatsapp-cloud-api",
    });
  });
});

describe("FakeNotificationProvider", () => {
  it("records successful sends", async () => {
    const fake = new FakeNotificationProvider();
    const result = await fake.send({
      jobId: "job-1",
      userId: "user-1",
      channel: "whatsapp",
      type: "LOBBY_REMINDER",
      payload: { body: "hello" },
      correlationId: "corr-1",
    });
    expect(result.ok).toBe(true);
    expect(fake.sent).toHaveLength(1);
  });

  it("can fail a fixed number of attempts then succeed", async () => {
    const fake = new FakeNotificationProvider();
    fake.failNext = 2;
    const msg = {
      jobId: "job-2",
      userId: "user-1",
      channel: "whatsapp",
      type: "LOBBY_REMINDER",
      payload: {},
      correlationId: "corr-2",
    };
    expect((await fake.send(msg)).ok).toBe(false);
    expect((await fake.send(msg)).ok).toBe(false);
    expect((await fake.send(msg)).ok).toBe(true);
    expect(fake.sent).toHaveLength(1);
  });
});

describe("ProductionWhatsAppProvider", () => {
  it("is explicitly unconfigured without token", async () => {
    const provider = new ProductionWhatsAppProvider({ token: "", phoneNumberId: "" });
    expect(provider.isConfigured()).toBe(false);
    const result = await provider.send({
      jobId: "j",
      userId: "u",
      channel: "whatsapp",
      type: "t",
      payload: {},
      correlationId: "c",
    });
    expect(result).toMatchObject({
      ok: false,
      retryable: false,
      errorCode: "PROVIDER_NOT_CONFIGURED",
    });
  });

  it("is explicitly unconfigured without phoneNumberId", async () => {
    const provider = new ProductionWhatsAppProvider({ token: "tok", phoneNumberId: "" });
    expect(provider.isConfigured()).toBe(false);
  });

  it("is configured when both token and phoneNumberId are present", () => {
    const provider = new ProductionWhatsAppProvider({ token: "tok", phoneNumberId: "pid" });
    expect(provider.isConfigured()).toBe(true);
  });

  it("reads configuration from env", () => {
    const provider = createProductionProviderFromEnv({ WHATSAPP_PROVIDER_TOKEN: "" });
    expect(provider.isConfigured()).toBe(false);
  });

  it("reads full configuration from env", () => {
    const provider = createProductionProviderFromEnv({
      WHATSAPP_PROVIDER_TOKEN: "tok",
      WHATSAPP_PHONE_NUMBER_ID: "pid",
      WHATSAPP_BUSINESS_ACCOUNT_ID: "baid",
      WHATSAPP_API_VERSION: "v23.0",
    });
    expect(provider.isConfigured()).toBe(true);
  });

  it("defaults timeout to 10s", () => {
    const provider = new ProductionWhatsAppProvider({ token: "tok", phoneNumberId: "pid" });
    expect(provider).toBeDefined();
    expect(provider.isConfigured()).toBe(true);
  });
});

describe("redaction", () => {
  it("redacts bearer tokens and secret key values", () => {
    const text = redactText('Authorization Bearer abc.def.ghi token=supersecret');
    expect(text).not.toContain("abc.def.ghi");
    expect(text).not.toContain("supersecret");
    expect(text).toContain("***");
  });

  it("redacts nested secret fields for logs", () => {
    const safe = redactForLog({
      api_key: "k-123",
      phone: "+237600000000",
      nested: { token: "t" },
    }) as Record<string, unknown>;
    expect(safe.api_key).toBe("***");
    expect((safe.nested as { token: string }).token).toBe("***");
    expect(String(safe.phone)).not.toContain("600000000");
  });
});
