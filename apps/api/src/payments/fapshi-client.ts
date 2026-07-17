/**
 * Official Fapshi HTTP client (collection credentials only).
 * Docs: https://docs.fapshi.com — apiuser/apikey headers, /initiate-pay, /payment-status/:transId.
 * Never logs credentials. Fail-closed when config/response is invalid.
 */
import {
  assertCheckoutLinkAllowed,
  assertExternalId,
  assertTransId,
  FAPSHI_MIN_AMOUNT_XAF,
  isAllowedFapshiBaseUrl,
  isFapshiWireStatus,
  type FapshiWireStatusName,
  redactFapshiSecrets,
} from "@session-jeu/shared";

export type FapshiInitiatePayBody = {
  amount: number;
  email?: string;
  redirectUrl?: string;
  userId?: string;
  externalId?: string;
  message?: string;
};

export type FapshiInitiatePayResponse = {
  message?: string;
  link: string;
  transId: string;
  dateInitiated?: string;
};

export type FapshiPaymentStatusResponse = {
  transId: string;
  status: FapshiWireStatusName;
  amount?: number;
  revenue?: number;
  externalId?: string;
  userId?: string;
  email?: string;
  redirectUrl?: string;
  dateInitiated?: string;
  dateConfirmed?: string;
  medium?: string;
  serviceName?: string;
  transType?: string;
};

export class FapshiClientError extends Error {
  readonly code: string;
  readonly httpStatus?: number;

  constructor(code: string, message: string, httpStatus?: number) {
    super(message);
    this.name = "FapshiClientError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

const DEFAULT_TIMEOUT_MS = 15_000;

export function isCollectionEnabled(): boolean {
  const raw = process.env.FAPSHI_COLLECTION_ENABLED;
  if (raw === undefined || raw === "") return true;
  return !/^(0|false|off|no)$/i.test(raw.trim());
}

export function resolveFapshiBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const fromEnv = env.FAPSHI_BASE_URL?.replace(/\/$/, "");
  if (fromEnv) {
    if (!isAllowedFapshiBaseUrl(fromEnv)) {
      throw new FapshiClientError(
        "PROVIDER_NOT_CONFIGURED",
        "FAPSHI_BASE_URL must be sandbox.fapshi.com or live.fapshi.com",
      );
    }
    return fromEnv;
  }
  if (env.FAPSHI_ENV === "live") return "https://live.fapshi.com";
  if (env.FAPSHI_ENV === "sandbox") return "https://sandbox.fapshi.com";
  throw new FapshiClientError(
    "PROVIDER_NOT_CONFIGURED",
    "FAPSHI_BASE_URL or FAPSHI_ENV required",
  );
}

export function getCollectionCredentials(env: NodeJS.ProcessEnv = process.env): {
  apiuser: string;
  apikey: string;
} {
  const apiuser = env.FAPSHI_API_USER?.trim();
  const apikey = env.FAPSHI_API_KEY?.trim();
  if (!apiuser || !apikey) {
    throw new FapshiClientError(
      "PROVIDER_NOT_CONFIGURED",
      "FAPSHI_API_USER and FAPSHI_API_KEY required",
    );
  }
  return { apiuser, apikey };
}

type FetchLike = typeof fetch;

export type FapshiClientOptions = {
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  env?: NodeJS.ProcessEnv;
};

async function requestJson<T>(
  path: string,
  init: RequestInit & { safeRetry?: boolean },
  options: FapshiClientOptions = {},
): Promise<T> {
  const env = options.env ?? process.env;
  const baseUrl = resolveFapshiBaseUrl(env);
  const { apiuser, apikey } = getCollectionCredentials(env);
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = {
    apiuser,
    apikey,
    ...(init.body ? { "content-type": "application/json" } : {}),
  };

  try {
    const doFetch = async () =>
      fetchImpl(`${baseUrl}${path}`, {
        ...init,
        headers: { ...headers, ...(init.headers as Record<string, string> | undefined) },
        signal: controller.signal,
      });

    let response: Response;
    try {
      response = await doFetch();
    } catch (err) {
      // Safe retry only for idempotent GET when no response was obtained.
      if (init.safeRetry && (!init.method || init.method === "GET")) {
        response = await doFetch();
      } else if (err instanceof Error && err.name === "AbortError") {
        throw new FapshiClientError(
          "PROVIDER_TIMEOUT_AMBIGUOUS",
          "Fapshi request timed out (ambiguous — do not re-initiate)",
        );
      } else {
        throw new FapshiClientError(
          "PROVIDER_ERROR",
          redactFapshiSecrets(err instanceof Error ? err.message : "network error"),
        );
      }
    }

    const rawText = await response.text();
    let body: Record<string, unknown> = {};
    if (rawText) {
      try {
        body = JSON.parse(rawText) as Record<string, unknown>;
      } catch {
        throw new FapshiClientError(
          "PROVIDER_ERROR",
          "Malformed Fapshi JSON response",
          response.status,
        );
      }
    }

    if (!response.ok) {
      const message =
        typeof body.message === "string"
          ? redactFapshiSecrets(body.message)
          : `Fapshi HTTP ${response.status}`;
      throw new FapshiClientError("PROVIDER_ERROR", message, response.status);
    }

    return body as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function initiatePay(
  input: FapshiInitiatePayBody,
  options?: FapshiClientOptions,
): Promise<FapshiInitiatePayResponse> {
  if (!isCollectionEnabled()) {
    throw new FapshiClientError("COLLECTION_DISABLED", "Fapshi collection kill switch active");
  }
  if (!Number.isSafeInteger(input.amount) || input.amount < FAPSHI_MIN_AMOUNT_XAF) {
    throw new FapshiClientError("PROVIDER_ERROR", `amount must be integer >= ${FAPSHI_MIN_AMOUNT_XAF}`);
  }
  if (input.externalId) assertExternalId(input.externalId);
  if (input.userId && !/^[a-zA-Z0-9_-]{1,100}$/.test(input.userId)) {
    throw new FapshiClientError("PROVIDER_ERROR", "invalid userId for Fapshi");
  }

  // Never retry POST initiate-pay blindly.
  const body = await requestJson<Record<string, unknown>>(
    "/initiate-pay",
    {
      method: "POST",
      body: JSON.stringify({
        amount: input.amount,
        ...(input.email ? { email: input.email } : {}),
        ...(input.redirectUrl ? { redirectUrl: input.redirectUrl } : {}),
        ...(input.userId ? { userId: input.userId } : {}),
        ...(input.externalId ? { externalId: input.externalId } : {}),
        ...(input.message ? { message: input.message } : {}),
      }),
      safeRetry: false,
    },
    options,
  );

  if (typeof body.link !== "string" || typeof body.transId !== "string") {
    throw new FapshiClientError("PROVIDER_ERROR", "Malformed initiate-pay response (link/transId)");
  }

  const transId = assertTransId(body.transId);
  assertCheckoutLinkAllowed(body.link);

  return {
    message: typeof body.message === "string" ? body.message : undefined,
    link: body.link,
    transId,
    dateInitiated: typeof body.dateInitiated === "string" ? body.dateInitiated : undefined,
  };
}

export async function getPaymentStatus(
  transId: string,
  options?: FapshiClientOptions,
): Promise<FapshiPaymentStatusResponse> {
  const safeId = assertTransId(transId);
  const body = await requestJson<Record<string, unknown>>(
    `/payment-status/${encodeURIComponent(safeId)}`,
    { method: "GET", safeRetry: true },
    options,
  );

  if (typeof body.transId !== "string" || !isFapshiWireStatus(body.status)) {
    throw new FapshiClientError(
      "PROVIDER_ERROR",
      "Malformed payment-status response",
    );
  }

  return {
    transId: assertTransId(body.transId),
    status: body.status,
    amount: typeof body.amount === "number" ? body.amount : undefined,
    revenue: typeof body.revenue === "number" ? body.revenue : undefined,
    externalId: typeof body.externalId === "string" ? body.externalId : undefined,
    userId: typeof body.userId === "string" ? body.userId : undefined,
    email: typeof body.email === "string" ? body.email : undefined,
    redirectUrl: typeof body.redirectUrl === "string" ? body.redirectUrl : undefined,
    dateInitiated: typeof body.dateInitiated === "string" ? body.dateInitiated : undefined,
    dateConfirmed: typeof body.dateConfirmed === "string" ? body.dateConfirmed : undefined,
    medium: typeof body.medium === "string" ? body.medium : undefined,
    serviceName: typeof body.serviceName === "string" ? body.serviceName : undefined,
    transType: typeof body.transType === "string" ? body.transType : undefined,
  };
}

export async function expirePay(
  transId: string,
  options?: FapshiClientOptions,
): Promise<FapshiPaymentStatusResponse> {
  const safeId = assertTransId(transId);
  const body = await requestJson<Record<string, unknown>>(
    "/expire-pay",
    {
      method: "POST",
      body: JSON.stringify({ transId: safeId }),
      safeRetry: false,
    },
    options,
  );
  if (typeof body.transId !== "string" || !isFapshiWireStatus(body.status)) {
    // expire-pay may return status-shaped body; if not, re-query
    return getPaymentStatus(safeId, options);
  }
  return {
    transId: assertTransId(body.transId),
    status: body.status,
    amount: typeof body.amount === "number" ? body.amount : undefined,
    externalId: typeof body.externalId === "string" ? body.externalId : undefined,
  };
}
