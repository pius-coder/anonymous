"use client";

import { useCallback, useEffect, useState } from "react";
import { api, apiPost, type ApiError } from "@/lib/api";

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  username?: string | null;
  role: string;
};

export type AuthInput = {
  email: string;
  password: string;
};

export type RegisterInput = {
  email: string;
  password: string;
  name?: string;
  username: string;
  phone?: string;
};

type MeResponse = { user: SessionUser };

const listeners = new Set<(u: SessionUser | null) => void>();
let cache: SessionUser | null = null;
let initialized = false;
const broadcast = (u: SessionUser | null) => {
  cache = u;
  listeners.forEach((l) => l(u));
};

export function useSession() {
  const [user, setUser] = useState<SessionUser | null>(cache);
  const [fetched, setFetched] = useState(initialized);
  const loading = !fetched;

  const refresh = useCallback(async () => {
    const res = await apiGet<MeResponse>("/me");
    if (res.ok) {
      broadcast(res.data.user);
      return res.data.user;
    }
    if (res.error.code === "UNAUTHENTICATED" || res.error.status === 401) {
      broadcast(null);
      return null;
    }
    broadcast(null);
    return null;
  }, []);

  useEffect(() => {
    listeners.add(setUser);
    if (!initialized) {
      initialized = true;
      void refresh().finally(() => setFetched(true));
    }
    return () => {
      listeners.delete(setUser);
    };
  }, [refresh]);

  const login = useCallback(async (input: AuthInput): Promise<ApiError | null> => {
    const res = await apiPost<MeResponse>("/auth/login", input);
    if (res.ok) {
      broadcast(res.data.user);
      return null;
    }
    return res.error;
  }, []);

  const register = useCallback(async (input: RegisterInput): Promise<ApiError | null> => {
    const res = await apiPost<MeResponse>("/auth/register", input);
    if (res.ok) {
      broadcast(res.data.user);
      return null;
    }
    return res.error;
  }, []);

  const logout = useCallback(async () => {
    await apiPost<{ loggedOut: boolean }>("/auth/logout");
    broadcast(null);
  }, []);

  return { user, loading, refresh, login, register, logout };
}

function apiGet<T>(path: string, signal?: AbortSignal) {
  return api<T>(path, { signal });
}
