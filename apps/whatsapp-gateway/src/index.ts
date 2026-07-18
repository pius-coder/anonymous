export type {
  NotificationMessage,
  NotificationProvider,
  SendFailure,
  SendResult,
  SendSuccess,
  WhatsAppProviderConfig,
} from "./provider/types.js";
export { FakeNotificationProvider } from "./provider/fake.js";
export {
  ProductionWhatsAppProvider,
  createProductionProviderFromEnv,
  type WhatsAppProviderConfig,
  type WhatsAppProviderOptions,
} from "./provider/production.js";
export type { WhatsAppProviderConfig as WhatsAppProviderConfigAlias } from "./provider/types.js";
export { redactForLog, redactPhone, redactText } from "./redaction.js";

export type WhatsAppGatewayFoundation = {
  service: "whatsapp-gateway";
  foundation: "v0.1";
  providerIntegration: "contractual-whatsapp-cloud-api";
};

export function getWhatsAppGatewayFoundation(): WhatsAppGatewayFoundation {
  return {
    service: "whatsapp-gateway",
    foundation: "v0.1",
    providerIntegration: "contractual-whatsapp-cloud-api",
  };
}

if (process.env.NODE_ENV !== "test" && process.env.WHATSAPP_GATEWAY_BOOT_LOG === "1") {
  const { createProductionProviderFromEnv } = await import("./provider/production.js");
  const provider = createProductionProviderFromEnv();
  console.log(
    JSON.stringify({
      service: "whatsapp-gateway",
      foundation: "v0.1",
      configured: provider.isConfigured(),
      provider: provider.name,
    }),
  );
}
