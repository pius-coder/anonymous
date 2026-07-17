/**
 * Collection orchestration helpers for official Fapshi (sandbox/live).
 * Webhook: verify x-wh-secret, durable inbox, settle only after payment-status.
 */
import { timingSafeEqual, randomBytes } from "node:crypto";
import {
  fapshiWebhookEventKey,
  FAPSHI_PROVIDER,
  hasVerifiedFapshiSuccessAmount,
  isFapshiWireStatus,
  mapFapshiWireToPaymentStatus,
  type FapshiWireStatusName,
} from "@session-jeu/shared";
import {
  FapshiClientError,
  getPaymentStatus,
  initiatePay,
  isCollectionEnabled,
  type FapshiPaymentStatusResponse,
} from "./fapshi-client.js";

export function generateProviderExternalId(): string {
  // 1-100 chars; a-z A-Z 0-9 - _
  return `pay_${randomBytes(16).toString("hex")}`;
}

export function buildServerRedirectUrl(paymentId: string): string | undefined {
  const base =
    process.env.APP_PUBLIC_URL?.replace(/\/$/, "") ||
    process.env.WEB_ORIGIN?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!base) return undefined;
  // Server-built only — never accept client arbitrary redirectUrl.
  return `${base}/payments/return?paymentId=${encodeURIComponent(paymentId)}`;
}

/**
 * Timing-safe compare of webhook secret. Secret MUST be configured (fail-closed).
 */
export function verifyWebhookSecret(
  providedHeader: string | undefined,
  configuredSecret: string | undefined,
): boolean {
  if (!configuredSecret || configuredSecret.length === 0) {
    return false;
  }
  if (!providedHeader || providedHeader.length === 0) {
    return false;
  }
  try {
    const a = Buffer.from(providedHeader);
    const b = Buffer.from(configuredSecret);
    if (a.length !== b.length) {
      // Constant-time-ish rejection without leaking length via early return timing
      // still compare equal-length padding
      const pad = Buffer.alloc(b.length);
      a.copy(pad);
      timingSafeEqual(pad, b);
      return false;
    }
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function parseFapshiWebhookPayload(body: unknown): {
  transId: string;
  status: FapshiWireStatusName;
  amount?: number;
  externalId?: string;
  userId?: string;
} {
  if (!body || typeof body !== "object") {
    throw new FapshiClientError("PROVIDER_ERROR", "Invalid webhook body");
  }
  const o = body as Record<string, unknown>;
  if (typeof o.transId !== "string" || !isFapshiWireStatus(o.status)) {
    throw new FapshiClientError("PROVIDER_ERROR", "Webhook missing transId/status");
  }
  return {
    transId: o.transId,
    status: o.status,
    amount: typeof o.amount === "number" ? o.amount : undefined,
    externalId: typeof o.externalId === "string" ? o.externalId : undefined,
    userId: typeof o.userId === "string" ? o.userId : undefined,
  };
}

export function webhookEventId(transId: string, status: string): string {
  return fapshiWebhookEventKey(transId, status);
}

export function redactedWebhookSummary(payload: {
  status: string;
  transId: string;
  amount?: number;
}): string {
  return `status=${payload.status} transId=${payload.transId.slice(0, 6)}… amount=${payload.amount ?? "?"}`;
}

export type SettlementMatchInput = {
  expectedAmountXaf: number;
  expectedCurrency?: string;
  expectedExternalId?: string | null;
  expectedUserId?: string | null;
  provider: FapshiPaymentStatusResponse;
};

/**
 * Before SUCCESS mutation: amount, externalId, and optional user identity must match.
 */
export function assertSettlementMatch(input: SettlementMatchInput): void {
  if (
    !hasVerifiedFapshiSuccessAmount({
      status: input.provider.status,
      expectedAmountXaf: input.expectedAmountXaf,
      providerAmountXaf: input.provider.amount,
    })
  ) {
    throw new FapshiClientError("PROVIDER_ERROR", "Amount mismatch on SUCCESSFUL settlement");
  }
  if (
    input.expectedExternalId &&
    input.provider.externalId &&
    input.provider.externalId !== input.expectedExternalId
  ) {
    throw new FapshiClientError("PROVIDER_ERROR", "externalId mismatch");
  }
  if (input.expectedUserId && input.provider.userId && input.provider.userId !== input.expectedUserId) {
    throw new FapshiClientError("PROVIDER_ERROR", "userId mismatch");
  }
}

export type InitiateCollectionInput = {
  amountXaf: number;
  userId: string;
  externalId: string;
  email?: string;
  paymentId: string;
  message?: string;
};

export type InitiateCollectionResult =
  | {
      kind: "ok";
      checkoutUrl: string;
      providerTransId: string;
      wireStatus: FapshiWireStatusName;
      paymentStatus: ReturnType<typeof mapFapshiWireToPaymentStatus>;
    }
  | { kind: "ambiguous_timeout"; error: FapshiClientError }
  | { kind: "error"; error: FapshiClientError };

export async function initiateCollectionCheckout(
  input: InitiateCollectionInput,
): Promise<InitiateCollectionResult> {
  if (!isCollectionEnabled()) {
    return {
      kind: "error",
      error: new FapshiClientError("COLLECTION_DISABLED", "Fapshi collection kill switch active"),
    };
  }

  const redirectUrl = buildServerRedirectUrl(input.paymentId);

  try {
    const response = await initiatePay({
      amount: input.amountXaf,
      email: input.email,
      redirectUrl,
      userId: input.userId,
      externalId: input.externalId,
      message: input.message ?? "Session jeu — droit d'accès",
    });
    return {
      kind: "ok",
      checkoutUrl: response.link,
      providerTransId: response.transId,
      wireStatus: "CREATED",
      paymentStatus: mapFapshiWireToPaymentStatus("CREATED"),
    };
  } catch (err) {
    if (err instanceof FapshiClientError && err.code === "PROVIDER_TIMEOUT_AMBIGUOUS") {
      return { kind: "ambiguous_timeout", error: err };
    }
    if (err instanceof FapshiClientError) {
      return { kind: "error", error: err };
    }
    return {
      kind: "error",
      error: new FapshiClientError(
        "PROVIDER_ERROR",
        err instanceof Error ? err.message : "provider error",
      ),
    };
  }
}

export async function fetchVerifiedProviderStatus(
  transId: string,
): Promise<FapshiPaymentStatusResponse> {
  return getPaymentStatus(transId);
}

export { FAPSHI_PROVIDER, mapFapshiWireToPaymentStatus };
