/**
 * In-process counters for success / retry / failure.
 * Suitable for unit tests and local ops; not a remote metrics backend.
 */

export type MetricSnapshot = {
  success: number;
  retry: number;
  failure: number;
  skipped: number;
};

const counters: MetricSnapshot = {
  success: 0,
  retry: 0,
  failure: 0,
  skipped: 0,
};

export function recordSuccess(): void {
  counters.success += 1;
}

export function recordRetry(): void {
  counters.retry += 1;
}

export function recordFailure(): void {
  counters.failure += 1;
}

export function recordSkipped(): void {
  counters.skipped += 1;
}

export function getMetrics(): MetricSnapshot {
  return { ...counters };
}

export function resetMetrics(): void {
  counters.success = 0;
  counters.retry = 0;
  counters.failure = 0;
  counters.skipped = 0;
}
