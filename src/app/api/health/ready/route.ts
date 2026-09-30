import { NextResponse } from 'next/server';
import { dbService } from '@/db/client';
import { redis } from '@/lib/redis';
import { sql } from 'drizzle-orm';

export const runtime = 'nodejs';

const TIMEOUT_MS = 3000;

function withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMsg)), ms)),
  ]);
}

/**
 * Readiness Probe: Checks whether critical runtime dependencies (PostgreSQL, Redis)
 * are healthy and capable of serving traffic.
 *
 * Returns:
 * - 200 when all dependencies are ready.
 * - 503 when any dependency is degraded or unreachable.
 */
export async function GET() {
  const checks: {
    database: { status: 'connected' | 'error'; latencyMs?: number; error?: string };
    redis: { status: 'connected' | 'error'; latencyMs?: number; error?: string };
  } = {
    database: { status: 'error' },
    redis: { status: 'error' },
  };

  let allReady = true;

  // 1. PostgreSQL check
  const dbStart = Date.now();
  try {
    await withTimeout(
      dbService.execute(sql`SELECT 1`),
      TIMEOUT_MS,
      'PostgreSQL query timed out',
    );
    checks.database = {
      status: 'connected',
      latencyMs: Date.now() - dbStart,
    };
  } catch (err: any) {
    allReady = false;
    checks.database = {
      status: 'error',
      latencyMs: Date.now() - dbStart,
      error: err?.message || 'Database check failed',
    };
  }

  // 2. Redis check
  const redisStart = Date.now();
  try {
    const pingResult = await withTimeout(
      redis.ping(),
      TIMEOUT_MS,
      'Redis ping timed out',
    );
    if (pingResult === 'PONG') {
      checks.redis = {
        status: 'connected',
        latencyMs: Date.now() - redisStart,
      };
    } else {
      throw new Error(`Unexpected Redis ping response: ${pingResult}`);
    }
  } catch (err: any) {
    allReady = false;
    checks.redis = {
      status: 'error',
      latencyMs: Date.now() - redisStart,
      error: err?.message || 'Redis check failed',
    };
  }

  const statusCode = allReady ? 200 : 503;

  return NextResponse.json(
    {
      status: allReady ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      dependencies: checks,
    },
    { status: statusCode },
  );
}
