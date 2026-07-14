export type WhatsAppGatewayFoundation = {
  service: "whatsapp-gateway";
  foundation: "v0.1";
  providerIntegration: "planned-only";
};

export function getWhatsAppGatewayFoundation(): WhatsAppGatewayFoundation {
  return {
    service: "whatsapp-gateway",
    foundation: "v0.1",
    providerIntegration: "planned-only",
  };
}

if (process.env.NODE_ENV !== "test") {
  console.log("WhatsApp gateway foundation ready. Provider integration intentionally removed.");
}

