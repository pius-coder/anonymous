export function getGatewayStatus() {
  return {
    service: "whatsapp-gateway",
    optional: true,
    ready: true,
    provider: "meta-whatsapp-cloud-api",
  };
}

export function isWhatsAppConfigured(env: NodeJS.ProcessEnv = process.env) {
  return Boolean(env.WHATSAPP_ACCESS_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID);
}

if (process.env.NODE_ENV !== "test") {
  console.log("WhatsApp Gateway placeholder - optional service ready");
}
