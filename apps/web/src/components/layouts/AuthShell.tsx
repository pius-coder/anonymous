import { notFound } from "next/navigation";
import { hasRole } from "@/services/auth/rba";

export async function requireAuth<T extends { role: string }>(
  userPromise: Promise<T | null>,
  allowedRoles: readonly string[],
): Promise<T> {
  const user = await userPromise;
  if (!user || !hasRole(user, allowedRoles)) {
    notFound();
  }
  return user;
}

export async function guardData<T>(dataPromise: Promise<T | null>): Promise<T> {
  const data = await dataPromise;
  if (!data) notFound();
  return data;
}

export function authorize<T extends { role: string }>(
  user: T | null,
  allowedRoles: readonly string[],
): user is T {
  return hasRole(user, allowedRoles);
}
