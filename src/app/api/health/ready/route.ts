import { NextResponse } from 'next/server';
import { dbService } from '@/db/client';
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
 * Readiness Probe: Checks whether critical runtime dependencies (PostgreSQL)
 * are healthy and capable of serving traffic.
 *
 * Returns:
 * - 200 when all dependencies are ready.
 * - 503 when any dependency is degraded or unreachable.
 */
export async function GET() {
  const checks: {
    database: { status: 'connected' | 'error'; latencyMs?: number; error?: string };
  } = {
    database: { status: 'error' },
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
