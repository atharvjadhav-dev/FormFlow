import { redis } from './redis';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
}

/**
 * Sliding-window rate limit backed by a Redis sorted set: each request adds
 * a timestamped member, old members outside the window get trimmed, and the
 * remaining count decides the verdict. One round trip (pipelined), safe
 * under concurrent hits from many pods since Redis executes the pipeline
 * atomically per key.
 */
export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const redisKey = `ratelimit:${key}`;
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;
  const member = `${now}-${Math.random().toString(36).slice(2)}`;

  try {
    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(redisKey, 0, windowStart);
    pipeline.zadd(redisKey, now, member);
    pipeline.zcard(redisKey);
    pipeline.expire(redisKey, windowSeconds);
    const results = await pipeline.exec();

    const count = (results?.[2]?.[1] as number) ?? 0;
    return { allowed: count <= limit, remaining: Math.max(0, limit - count), limit };
  } catch (err) {
    // Fail OPEN: a Redis outage should degrade to "no rate limiting for a
    // bit", never to "every submission 500s". This is a deliberate
    // trade-off — re-visit if abuse resistance ever needs to win over
    // availability for this specific endpoint.
    console.error('[rate-limit] Redis unavailable, allowing request', err);
    return { allowed: true, remaining: limit, limit };
  }
}

/** Per-IP limit for the public submit endpoint: generous enough for a real applicant retrying, tight enough to blunt a script. */
export const SUBMIT_RATE_LIMIT = { limit: 10, windowSeconds: 60 };
export const PRESIGN_RATE_LIMIT = { limit: 20, windowSeconds: 60 };
