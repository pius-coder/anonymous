"use server";

import { AuthService } from "@/services/auth/AuthService";
import type { SessionUser } from "@/services/auth/types";

export async function login(email: string, password: string): Promise<SessionUser | { code: string; message: string }> {
  try {
    const auth = new AuthService();
    return await auth.login({ email, password });
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    return { code: err.code ?? "UNKNOWN", message: err.message ?? "Erreur de connexion" };
  }
}

export async function register(input: {
  email: string;
  password: string;
  username: string;
  name?: string;
  phone?: string;
}): Promise<SessionUser | { code: string; message: string }> {
  try {
    const auth = new AuthService();
    return await auth.register(input);
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    return { code: err.code ?? "UNKNOWN", message: err.message ?? "Erreur d'inscription" };
  }
}

export async function logout(): Promise<{ success: boolean }> {
  try {
    const auth = new AuthService();
    await auth.logout();
    return { success: true };
  } catch {
    return { success: true };
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const auth = new AuthService();
    return await auth.getMe();
  } catch {
    return null;
  }
}
