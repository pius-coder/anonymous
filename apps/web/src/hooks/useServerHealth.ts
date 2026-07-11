"use client";

import { useEffect, useState } from "react";

export type ServerHealthStatus = "checking" | "ok" | "slow" | "down";

export type ServerHealthState = {
  status: ServerHealthStatus;
  latencyMs: number | null;
  checkedAt: string | null;
  error: string | null;
};

const DEFAULT_INTERVAL_MS = 30_000;
const MAX_RETRY_INTERVAL_MS = 120_000;
const SLOW_THRESHOLD_MS = 900;

export function useServerHealth(intervalMs = DEFAULT_INTERVAL_MS): ServerHealthState {
  const [health, setHealth] = useState<ServerHealthState>({
    status: "checking",
    latencyMs: null,
    checkedAt: null,
    error: null,
  });

  useEffect(() => {
    let disposed = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    let consecutiveFailures = 0;

    const clearScheduledCheck = () => {
      if (timeout) clearTimeout(timeout);
      timeout = undefined;
    };

    const schedule = (delay: number) => {
      clearScheduledCheck();
      if (!disposed && intervalMs > 0 && document.visibilityState === "visible") {
        timeout = setTimeout(check, delay);
      }
    };

    const check = async () => {
      if (document.visibilityState !== "visible") return;
      controller?.abort();
      controller = new AbortController();
      const startedAt = performance.now();

      try {
        const response = await fetch("/api/health", {
          cache: "no-store",
          signal: controller.signal,
        });
        const latencyMs = Math.max(1, Math.round(performance.now() - startedAt));
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const payload = (await response.json().catch(() => null)) as {
          status?: string;
          timestamp?: string;
        } | null;
        if (disposed) return;

        setHealth({
          status: latencyMs >= SLOW_THRESHOLD_MS ? "slow" : "ok",
          latencyMs,
          checkedAt: payload?.timestamp ?? new Date().toISOString(),
          error: null,
        });
        consecutiveFailures = 0;
      } catch (error) {
        if (disposed || (error instanceof DOMException && error.name === "AbortError")) return;
        setHealth({
          status: "down",
          latencyMs: null,
          checkedAt: new Date().toISOString(),
          error: error instanceof Error ? error.message : "health check failed",
        });
        consecutiveFailures += 1;
      } finally {
        const delay =
          consecutiveFailures === 0
            ? intervalMs
            : Math.min(intervalMs * 2 ** consecutiveFailures, MAX_RETRY_INTERVAL_MS);
        schedule(delay);
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        clearScheduledCheck();
        controller?.abort();
        return;
      }
      void check();
    };

    void check();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      disposed = true;
      controller?.abort();
      clearScheduledCheck();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [intervalMs]);

  return health;
}
