"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
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

function compactRegisterInput(input: RegisterInput): RegisterInput {
  const name = input.name?.trim();
  const phone = input.phone?.trim();
  return {
    email: input.email,
    password: input.password,
    username: input.username,
    ...(name ? { name } : {}),
    ...(phone ? { phone } : {}),
  };
}

const listeners = new Set<() => void>();
let cache: SessionUser | null = null;
let initialized = false;
let initialRefresh: Promise<SessionUser | null> | null = null;

const emitChange = () => {
  listeners.forEach((listener) => listener());
};

const broadcast = (u: SessionUser | null) => {
  cache = u;
  emitChange();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getUserSnapshot = () => cache;
const getServerUserSnapshot = () => null;
const getFetchedSnapshot = () => initialized && initialRefresh === null;
const getServerFetchedSnapshot = () => false;

export function useSession() {
  const user = useSyncExternalStore(subscribe, getUserSnapshot, getServerUserSnapshot);
  const fetched = useSyncExternalStore(subscribe, getFetchedSnapshot, getServerFetchedSnapshot);
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
    if (initialized) return;

    initialized = true;
    initialRefresh = refresh().finally(() => {
      initialRefresh = null;
      emitChange();
    });
    emitChange();
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
    const res = await apiPost<MeResponse>("/auth/register", compactRegisterInput(input));
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
