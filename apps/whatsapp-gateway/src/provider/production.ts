import type { NotificationMessage, NotificationProvider, SendResult } from "./types.js";

export type ProductionProviderConfig = {
  /**
   * Provider API token. When absent/empty, the gateway stays explicitly unconfigured
   * and never pretends to deliver.
   */
  token?: string | null;
  /** Optional provider base URL (unused until a real SDK is chosen). */
  baseUrl?: string | null;
};

/**
 * Production-facing provider.
 * No external SDK is wired: without an explicit token the provider always fails
 * as PROVIDER_NOT_CONFIGURED (non-retryable). When a token is present, delivery
 * still refuses until a real provider SDK is approved (fail-closed).
 */
export class ProductionWhatsAppProvider implements NotificationProvider {
  readonly name = "whatsapp-production";
  private readonly configured: boolean;

  constructor(config: ProductionProviderConfig = {}) {
    this.configured = Boolean(config.token && config.token.trim().length > 0);
  }

  isConfigured(): boolean {
    return this.configured;
  }

  async send(_message: NotificationMessage): Promise<SendResult> {
    if (!this.configured) {
      return {
        ok: false,
        retryable: false,
        errorCode: "PROVIDER_NOT_CONFIGURED",
        errorMessage:
          "Production WhatsApp provider is not configured (no token). Delivery refused.",
      };
    }

    // Fail closed: token present does not imply a validated SDK integration.
    return {
      ok: false,
      retryable: false,
      errorCode: "PROVIDER_SDK_NOT_WIRED",
      errorMessage:
        "A provider token is present but no official SDK is integrated yet. Delivery refused.",
    };
  }
}

export function createProductionProviderFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): ProductionWhatsAppProvider {
  return new ProductionWhatsAppProvider({
    token: env.WHATSAPP_PROVIDER_TOKEN,
    baseUrl: env.WHATSAPP_PROVIDER_BASE_URL,
  });
}
