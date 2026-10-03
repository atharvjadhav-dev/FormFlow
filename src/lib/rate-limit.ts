export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
}

/**
 * In-memory sliding-window rate limiter.
 * Replaces external Redis dependency with a zero-dependency local store
 * that tracks timestamps per key within the window.
 */
const rateLimitStore = new Map<string, number[]>();

// Periodically purge stale keys every 60s to prevent unbounded memory growth
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of rateLimitStore.entries()) {
      const active = timestamps.filter((t) => now - t < 120_000);
      if (active.length === 0) {
        rateLimitStore.delete(key);
      } else {
        rateLimitStore.set(key, active);
      }
    }
  }, 60_000).unref?.();
}

/**
 * Checks sliding-window rate limit for a given key.
 *
 * @param key Unique identifier (e.g. IP address or user ID)
 * @param limit Maximum allowed requests within the window
 * @param windowSeconds Time window in seconds
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;

  const existing = rateLimitStore.get(key) || [];
  const valid = existing.filter((t) => t > windowStart);

  if (valid.length >= limit) {
    return {
      allowed: false,
      remaining: 0,
      limit,
    };
  }

  valid.push(now);
  rateLimitStore.set(key, valid);

  return {
    allowed: true,
    remaining: Math.max(0, limit - valid.length),
    limit,
  };
}

/** Per-IP limit for the public submit endpoint: generous enough for a real applicant retrying, tight enough to blunt a script. */
export const SUBMIT_RATE_LIMIT = { limit: 10, windowSeconds: 60 };
export const PRESIGN_RATE_LIMIT = { limit: 20, windowSeconds: 60 };
