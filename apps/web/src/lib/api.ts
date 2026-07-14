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

export async function api<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(url, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...options?.headers },
      ...options,
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
