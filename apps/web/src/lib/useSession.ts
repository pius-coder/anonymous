import { useSyncExternalStore, useCallback, useEffect } from "react";
import { AuthService } from "../services/auth/AuthService";

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
let initialized = false;
let refreshPromise: Promise<void> | null = null;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l());
}

function setState(next: Partial<SessionState>) {
  cache = { ...cache, ...next };
  notify();
}

function refresh() {
  if (refreshPromise) return refreshPromise;

  initialized = true;
  setState({ loading: true, error: null });
  refreshPromise = AuthService.getMe()
    .then((res) => {
      if (res.success) {
        setState({ user: res.data.user, loading: false });
      } else {
        setState({ user: null, loading: false, error: null });
      }
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return cache;
}

export function useSession({ refreshOnMount = true }: { refreshOnMount?: boolean } = {}) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (refreshOnMount && !initialized) {
      void refresh();
    }
  }, [refreshOnMount]);

  const login = useCallback(async (email: string, password: string) => {
    setState({ loading: true, error: null });
    const res = await AuthService.login(email, password);
    if (res.success) {
      initialized = true;
      setState({ user: res.data.user, loading: false });
    } else {
      setState({ loading: false, error: res.error.message });
    }
    return res;
  }, []);

  const register = useCallback(async (email: string, password: string, name?: string) => {
    setState({ loading: true, error: null });
    const res = await AuthService.register(email, password, name);
    if (res.success) {
      initialized = true;
      setState({ user: res.data.user, loading: false });
    } else {
      setState({ loading: false, error: res.error.message });
    }
    return res;
  }, []);

  const logout = useCallback(async () => {
    await AuthService.logout();
    setState({ user: null, loading: false, error: null });
  }, []);

  return { ...state, login, register, logout, refresh };
}
