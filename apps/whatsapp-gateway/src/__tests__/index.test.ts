import { describe, expect, it } from "vitest";
import { getWhatsAppGatewayFoundation } from "../index.js";

describe("whatsapp gateway foundation", () => {
  it("keeps only the provider foundation marker", () => {
    expect(getWhatsAppGatewayFoundation()).toEqual({
      service: "whatsapp-gateway",
      foundation: "v0.1",
      providerIntegration: "planned-only",
    });
  });
});

