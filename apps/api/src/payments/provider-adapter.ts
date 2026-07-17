/**
 * Payment provider adapter (Fapshi-compatible port).
 * Does not call a real remote SDK unless FAPSHI_API_URL + FAPSHI_API_KEY are set.
 * Ownership: A-PAYMENT may own this adapter; contracts/schema/worker remain out of scope.
 * P-SEQ-00: never emit fapshi-local references in staging/production.
 */
import { isStrictDeployEnv, resolveAppEnv } from "@session-jeu/config";

export type ExternalInitiateInput = {
  transactionId: string;
  amount: number;
  currency: string;
  userId: string;
  idempotencyKey: string;
};

export type ExternalInitiateResult = {
  checkoutUrl: string;
  providerReference: string;
  provider: "FAPSHI";
};

/**
 * Initiate an external checkout. Returns a deterministic local checkout URL in
 * foundation mode so UI can poll status without inventing amounts or statuses.
 */
export async function initiateExternalCheckout(
  input: ExternalInitiateInput,
): Promise<ExternalInitiateResult> {
  const apiUrl = process.env.FAPSHI_API_URL;
  const apiKey = process.env.FAPSHI_API_KEY;

  if (apiUrl && apiKey) {
    // Real provider path — kept minimal and behind env gates (no secrets logged).
    const response = await fetch(`${apiUrl.replace(/\/$/, "")}/initiate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "Idempotency-Key": input.idempotencyKey,
      },
      body: JSON.stringify({
        externalId: input.transactionId,
        amount: input.amount,
        currency: input.currency,
        userId: input.userId,
      }),
    });
    if (!response.ok) {
      throw new Error("PROVIDER_ERROR");
    }
    const body = (await response.json()) as {
      checkoutUrl?: string;
      reference?: string;
    };
    if (!body.checkoutUrl || !body.reference) {
      throw new Error("PROVIDER_ERROR");
    }
    return {
      checkoutUrl: body.checkoutUrl,
      providerReference: body.reference,
      provider: "FAPSHI",
    };
  }

  // Foundation / offline adapter: local/test only — never staging/production.
  if (isStrictDeployEnv(resolveAppEnv())) {
    throw new Error("PROVIDER_NOT_CONFIGURED");
  }

  return {
    checkoutUrl: `/payments/checkout/${input.transactionId}`,
    providerReference: `fapshi-local-${input.transactionId}`,
    provider: "FAPSHI",
  };
}

export function verifyWebhookSignature(signature: string, secret: string | undefined): boolean {
  if (!secret) {
    if (isStrictDeployEnv(resolveAppEnv())) {
      return false;
    }
    // When secret is unset (local/dev), accept any non-empty signature so tests
    // can exercise the happy path; production must set FAPSHI_WEBHOOK_SECRET.
    return signature.length > 0;
  }
  return signature === secret;
}
