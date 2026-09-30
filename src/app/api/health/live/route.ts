import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Liveness Probe: Checks ONLY that the Node.js application process is running and responsive.
 * MUST NOT depend on database, Redis, or any external service.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
    { status: 200 },
  );
}
