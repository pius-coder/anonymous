import { useSyncExternalStore, useCallback, useEffect, useRef } from "react";
import { api } from "./api";

type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  roles: string[];
  sessionVersion: number;
  createdAt: string;
};

type SessionState = {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
};

type Listener = () => void;

let cache: SessionState = { user: null, loading: true, error: null };
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l());
}

function setState(next: Partial<SessionState>) {
  cache = { ...cache, ...next };
  notify();
}

async function refresh() {
  setState({ loading: true, error: null });
  const res = await api<{ user: AuthUser }>("/api/v1/me");
  if (res.success) {
    setState({ user: res.data.user, loading: false });
  } else {
    setState({ user: null, loading: false, error: null });
  }
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return cache;
}

export function useSession() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      refresh();
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setState({ loading: true, error: null });
    const res = await api<{ user: AuthUser }>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (res.success) {
      setState({ user: res.data.user, loading: false });
    } else {
      setState({ loading: false, error: res.error.message });
    }
    return res;
  }, []);

  const register = useCallback(async (email: string, password: string, name?: string) => {
    setState({ loading: true, error: null });
    const res = await api<{ user: AuthUser }>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    });
    if (res.success) {
      setState({ user: res.data.user, loading: false });
    } else {
      setState({ loading: false, error: res.error.message });
    }
    return res;
  }, []);

  const logout = useCallback(async () => {
    await api("/api/v1/auth/logout", { method: "POST" });
    setState({ user: null, loading: false, error: null });
  }, []);

  return { ...state, login, register, logout, refresh };
}
