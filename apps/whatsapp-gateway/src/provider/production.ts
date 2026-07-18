import Client from "@great-detail/whatsapp";
import type { NotificationMessage, NotificationProvider, SendResult } from "./types.js";

export type WhatsAppProviderConfig = {
  token: string;
  phoneNumberId: string;
  businessAccountId?: string;
  apiVersion?: string;
};

export type WhatsAppProviderOptions = {
  timeout?: number;
};

export class ProductionWhatsAppProvider implements NotificationProvider {
  readonly name = "whatsapp-production";
  private readonly configured: boolean;
  private readonly client: Client | null;
  private readonly phoneNumberId: string;
  private readonly timeout: number;

  constructor(
    config: WhatsAppProviderConfig,
    options: WhatsAppProviderOptions = {},
  ) {
    this.timeout = options.timeout ?? 10000;
    this.phoneNumberId = config.phoneNumberId;

    if (!config.token?.trim() || !config.phoneNumberId?.trim()) {
      this.configured = false;
      this.client = null;
    } else {
      this.configured = true;
      this.client = new Client({
        request: {
          headers: {
            Authorization: `Bearer ${config.token}`,
          },
          timeout: this.timeout,
          retry: 0,
        },
      });
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  async send(message: NotificationMessage): Promise<SendResult> {
    if (!this.configured || !this.client) {
      return {
        ok: false,
        retryable: false,
        errorCode: "PROVIDER_NOT_CONFIGURED",
        errorMessage: "WhatsApp provider is not configured (missing token or phone number ID).",
      };
    }

    try {
      const payload = message.payload as Record<string, unknown> | undefined;
      const body = typeof payload?.body === "string" ? payload.body : undefined;
      const templateName = typeof payload?.templateName === "string" ? payload.templateName : undefined;
      const language = typeof payload?.language === "string" ? payload.language : "fr";

      const params: Record<string, unknown> = {
        phoneNumberID: this.phoneNumberId,
        to: message.userId,
      };

      if (templateName) {
        params.type = "template";
        params.template = {
          name: templateName,
          language: { code: language },
        };
      } else if (body) {
        params.type = "text";
        params.text = { body };
      } else {
        params.type = "text";
        params.text = { body: "Notification" };
      }

      const result = await this.client.message.createMessage(params);

      return {
        ok: true,
        providerMessageId: result.messages?.[0]?.id ?? `unknown-${message.jobId}`,
      };
    } catch (error) {
      return this.mapError(error);
    }
  }

  private mapError(error: unknown): SendResult {
    const errMsg = error instanceof Error ? error.message : String(error);

    if (error instanceof TypeError || errMsg.includes("timeout") || errMsg.includes("network") || errMsg.includes("fetch")) {
      return { ok: false, retryable: true, errorCode: "PROVIDER_UNAVAILABLE", errorMessage: "Provider unreachable or timed out" };
    }

    if (errMsg.includes("429") || errMsg.includes("rate") || errMsg.includes("too many")) {
      return { ok: false, retryable: true, errorCode: "RATE_LIMITED", errorMessage: "Provider rate limit exceeded" };
    }

    if (errMsg.includes("400") || errMsg.includes("invalid")) {
      return { ok: false, retryable: false, errorCode: "INVALID_RECIPIENT", errorMessage: "Invalid recipient or message content" };
    }

    if (errMsg.includes("500") || errMsg.includes("503") || errMsg.includes("server")) {
      return { ok: false, retryable: true, errorCode: "PROVIDER_ERROR", errorMessage: "Provider internal error" };
    }

    return { ok: false, retryable: false, errorCode: "PROVIDER_REJECTED", errorMessage: `Provider rejected: ${errMsg.slice(0, 200)}` };
  }
}

export function createProductionProviderFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): ProductionWhatsAppProvider {
  const token = env.WHATSAPP_PROVIDER_TOKEN?.trim();
  const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID?.trim();

  return new ProductionWhatsAppProvider(
    {
      token: token ?? "",
      phoneNumberId: phoneNumberId ?? "",
      businessAccountId: env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim(),
      apiVersion: env.WHATSAPP_API_VERSION?.trim() || "v23.0",
    },
    { timeout: Number(env.WHATSAPP_TIMEOUT_MS) || 10000 },
  );
}
