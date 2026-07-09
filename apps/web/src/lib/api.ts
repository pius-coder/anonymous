"use client";

export type ApiError = {
  code: string;
  message: string;
  details?: Record<string, string[] | unknown>;
  status: number;
};

export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

export type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

const BASE = "/api/v1";

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<ApiResponse<T>> {
  const init: RequestInit = {
    method: opts.method ?? "GET",
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(opts.headers ?? {}),
    },
    signal: opts.signal,
  };
  if (opts.body !== undefined) init.body = JSON.stringify(opts.body);

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, init);
  } catch {
    return { ok: false, error: { code: "NETWORK_ERROR", message: "Réseau injoignable", status: 0 } };
  }

  const text = await res.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!res.ok || (payload && typeof payload === "object" && "success" in payload && payload.success === false)) {
    const errObj =
      payload && typeof payload === "object" && "error" in payload && payload.error && typeof payload.error === "object"
        ? (payload.error as Record<string, unknown>)
        : {};
    const code = typeof errObj.code === "string" ? errObj.code : "HTTP_ERROR";
    const message = typeof errObj.message === "string" ? errObj.message : `HTTP ${res.status}`;
    const details = (errObj.details as Record<string, string[]>) ?? undefined;
    return { ok: false, error: { code, message, status: res.status, details } };
  }

  const data =
    payload && typeof payload === "object" && "data" in payload ? (payload.data as T) : (payload as T);
  return { ok: true, data: data as T };
}

export const apiGet = <T>(path: string, signal?: AbortSignal) => api<T>(path, { signal });
export const apiPost = <T>(path: string, body?: unknown, signal?: AbortSignal) =>
  api<T>(path, { method: "POST", body, signal });
export const apiPatch = <T>(path: string, body?: unknown, signal?: AbortSignal) =>
  api<T>(path, { method: "PATCH", body, signal });
export const apiDelete = <T>(path: string, signal?: AbortSignal) =>
  api<T>(path, { method: "DELETE", signal });

export function isApiError<T>(r: ApiResponse<T>): r is { ok: false; error: ApiError } {
  return r.ok === false;
}

export function unwrap<T>(r: ApiResponse<T>): T {
  if (r.ok) return r.data;
  throw r.error;
}
