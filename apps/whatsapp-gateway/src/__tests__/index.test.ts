import { describe, it, expect } from "vitest";
import { getGatewayStatus, isWhatsAppConfigured } from "../index.js";

describe("WhatsApp Gateway", () => {
  it("is an optional gateway placeholder", () => {
    expect(getGatewayStatus()).toMatchObject({
      service: "whatsapp-gateway",
      optional: true,
      ready: true,
    });
  });

  it("detects whether WhatsApp credentials are configured", () => {
    expect(
      isWhatsAppConfigured({
        WHATSAPP_ACCESS_TOKEN: "token",
        WHATSAPP_PHONE_NUMBER_ID: "phone-id",
      } as NodeJS.ProcessEnv),
    ).toBe(true);
    expect(isWhatsAppConfigured({} as NodeJS.ProcessEnv)).toBe(false);
  });
});
