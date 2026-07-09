import { cookies } from "next/headers";
import type { AdminUser } from "./admin-types";

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; details?: unknown } };

const API_BASE = process.env.API_URL || "http://localhost:3001";

export async function adminApiGet<T>(path: string): Promise<T | null> {
  const cookieHeader = (await cookies()).toString();

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      cache: "no-store",
      headers: cookieHeader ? { cookie: cookieHeader } : {},
    });
    if (!res.ok) return null;
    const json = (await res.json()) as ApiEnvelope<T>;
    if (!json.success) return null;
    return json.data;
  } catch {
    return null;
  }
}

export async function getCurrentAdmin(): Promise<AdminUser | null> {
  const result = await adminApiGet<{ user: AdminUser }>("/v1/me");
  return result?.user ?? null;
}

export function queryString(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const value = search.toString();
  return value ? `?${value}` : "";
}
