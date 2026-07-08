type Bucket = {
  count: number;
  resetAt: number;
};

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const buckets = new Map<string, Bucket>();

export function consumeAuthRateLimit(key: string, now = Date.now()) {
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1, resetAt: now + WINDOW_MS };
  }

  bucket.count += 1;
  return {
    allowed: bucket.count <= MAX_ATTEMPTS,
    remaining: Math.max(0, MAX_ATTEMPTS - bucket.count),
    resetAt: bucket.resetAt,
  };
}

export function clearAuthRateLimit(key: string) {
  buckets.delete(key);
}

export function resetAuthRateLimits() {
  buckets.clear();
}
