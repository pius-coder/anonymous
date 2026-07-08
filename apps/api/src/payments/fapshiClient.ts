export const FAPSHI_PROVIDER = "FAPSHI";
export const FAPSHI_MIN_AMOUNT_XAF = 100;

export type FapshiProviderStatus = "CREATED" | "PENDING" | "SUCCESSFUL" | "FAILED" | "EXPIRED";

export type FapshiInitiateResponse = {
  message?: string;
  link: string;
  transId: string;
  dateInitiated?: string;
};

export type FapshiStatusResponse = {
  transId: string;
  status: FapshiProviderStatus;
  amount?: number;
  revenue?: number;
  externalId?: string;
  userId?: string;
  dateInitiated?: string;
  dateConfirmed?: string;
  [key: string]: unknown;
};

export class FapshiProviderError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
  }
}

function getFapshiBaseUrl() {
  if (process.env.FAPSHI_BASE_URL) return process.env.FAPSHI_BASE_URL;
  return process.env.FAPSHI_ENV === "live"
    ? "https://live.fapshi.com"
    : "https://sandbox.fapshi.com";
}

function getFapshiCredentials() {
  const apiuser = process.env.FAPSHI_API_USER;
  const apikey = process.env.FAPSHI_API_KEY;
  if (!apiuser || !apikey) {
    throw new FapshiProviderError("Fapshi credentials are not configured");
  }
  return { apiuser, apikey };
}

async function requestFapshi<T>(path: string, init: RequestInit = {}) {
  const { apiuser, apikey } = getFapshiCredentials();
  const res = await fetch(`${getFapshiBaseUrl()}${path}`, {
    ...init,
    headers: {
      apiuser,
      apikey,
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });

  const body = (await res.json().catch(() => ({}))) as { message?: string };
  if (!res.ok) {
    throw new FapshiProviderError(body.message ?? "Fapshi request failed", res.status);
  }
  return body as T;
}

export async function initiateFapshiPayment(input: {
  amountXaf: number;
  email?: string;
  redirectUrl?: string;
  userId: string;
  externalId: string;
  message: string;
}) {
  return requestFapshi<FapshiInitiateResponse>("/initiate-pay", {
    method: "POST",
    body: JSON.stringify({
      amount: input.amountXaf,
      email: input.email,
      redirectUrl: input.redirectUrl,
      userId: input.userId,
      externalId: input.externalId,
      message: input.message,
    }),
  });
}

export async function getFapshiPaymentStatus(transId: string) {
  return requestFapshi<FapshiStatusResponse>(`/payment-status/${encodeURIComponent(transId)}`);
}
