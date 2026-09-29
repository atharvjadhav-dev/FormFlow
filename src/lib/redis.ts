import Redis from 'ioredis';

declare global {
  var __redis: Redis | undefined;
}

// Reuse the connection across hot-reloads/module re-evaluation in dev,
// same reasoning as the pg Pool in db/client.ts.
export const redis = globalThis.__redis ?? new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  retryStrategy: (times) => Math.min(times * 200, 2000),
});

redis.on('error', (err) => {
  // Swallow at the client level too — checkRateLimit/getPublicForm already
  // catch per-call, but ioredis also emits a generic 'error' event that
  // would otherwise crash the process if nothing is listening for it.
  console.error('[redis] connection error', err.message);
});

if (process.env.NODE_ENV !== 'production') globalThis.__redis = redis;
