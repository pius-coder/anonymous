/**
 * Payment provider adapter — official Fapshi collection only.
 * No Bearer, no /initiate, no fapshi-local-*, no invented checkoutUrl/reference.
 */
import {
  generateProviderExternalId,
  initiateCollectionCheckout,
  verifyWebhookSecret,
  type InitiateCollectionResult,
} from "./fapshi-collection.js";
import { FapshiClientError } from "./fapshi-client.js";

export type ExternalInitiateInput = {
  paymentId: string;
  transactionId: string;
  amount: number;
  currency: string;
  userId: string;
  externalId: string;
  idempotencyKey: string;
  email?: string;
  message?: string;
};

export type ExternalInitiateResult = {
  checkoutUrl: string;
  providerTransId: string;
  providerExternalId: string;
  provider: "FAPSHI";
  wireStatus: string;
  ambiguousTimeout?: boolean;
};

/**
 * Initiate official Fapshi checkout. Fail-closed: never invents local checkout.
 */
export async function initiateExternalCheckout(
  input: ExternalInitiateInput,
): Promise<ExternalInitiateResult> {
  const result: InitiateCollectionResult = await initiateCollectionCheckout({
    amountXaf: input.amount,
    userId: input.userId,
    externalId: input.externalId,
    email: input.email,
    paymentId: input.paymentId,
    message: input.message,
  });

  if (result.kind === "ok") {
    return {
      checkoutUrl: result.checkoutUrl,
      providerTransId: result.providerTransId,
      providerExternalId: input.externalId,
      provider: "FAPSHI",
      wireStatus: result.wireStatus,
    };
  }

  if (result.kind === "ambiguous_timeout") {
    const err = new Error("PROVIDER_TIMEOUT_AMBIGUOUS");
    (err as Error & { code?: string }).code = "PROVIDER_TIMEOUT_AMBIGUOUS";
    throw err;
  }

  const code = result.error.code;
  const err = new Error(code === "CHECKOUT_LINK_REJECTED" ? "CHECKOUT_LINK_REJECTED" : code);
  (err as Error & { code?: string }).code = code;
  throw err;
}

/** @deprecated use verifyWebhookSecret — kept name for call sites during migration */
export function verifyWebhookSignature(
  providedHeader: string,
  secret: string | undefined,
): boolean {
  return verifyWebhookSecret(providedHeader, secret);
}

export { generateProviderExternalId, verifyWebhookSecret, FapshiClientError };
