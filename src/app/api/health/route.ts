import { NextResponse } from 'next/server';
import { dbService } from '@/db/client';
import { sql } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await dbService.execute(sql`SELECT 1`);
    return NextResponse.json({ status: 'ok' });
  } catch (err) {
    console.error('[health] database check failed', err);
    return NextResponse.json({ status: 'error' }, { status: 503 });
  }
}
