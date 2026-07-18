import { publicEnv } from "./env";

type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};

type ApiSuccess<T> = {
  success: true;
  data: T;
};

type ApiFailure = {
  success: false;
  error: ApiError;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export function buildApiUrl(url: string) {
  if (/^https?:\/\//.test(url) || url.startsWith("/api/")) {
    return url;
  }

  const base = publicEnv.NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, "");
  const path = url.startsWith("/") ? url : `/${url}`;

  return `${base}${path}`;
}

export async function api<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const { headers: optionHeaders, signal, ...rest } = options ?? {};
    const res = await fetch(buildApiUrl(url), {
      credentials: "include",
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(optionHeaders as Record<string, string> | undefined),
      },
      signal: signal ?? AbortSignal.timeout(15_000),
    });

    const body = await res.json();

    if (!res.ok || body.success === false) {
      return { success: false, error: body.error || { code: "UNKNOWN", message: "Erreur inconnue" } };
    }

    return { success: true, data: body.data };
  } catch {
    return { success: false, error: { code: "NETWORK_ERROR", message: "Erreur réseau" } };
  }
}
