import { NextResponse } from 'next/server';
import { submitToPublicForm } from '@/db/public';
import { checkRateLimit, SUBMIT_RATE_LIMIT } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const REASON_MESSAGES: Record<string, string> = {
  'not-found': 'This form does not exist.',
  'not-yet-open': "Applications haven't opened yet.",
  closed: 'Applications are closed.',
  'stale-version': 'This form was updated since you opened it — please reload and try again.',
};

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  const { allowed } = await checkRateLimit(`submit:${slug}:${ip}`, SUBMIT_RATE_LIMIT.limit, SUBMIT_RATE_LIMIT.windowSeconds);
  if (!allowed) {
    return NextResponse.json({ message: 'Too many attempts — please wait a moment and try again.' }, { status: 429, headers: { 'Retry-After': String(SUBMIT_RATE_LIMIT.windowSeconds) } });
  }

  const body = await req.json().catch(() => null);

  if (!body?.formVersionId || !body?.idempotencyKey || typeof body.answers !== 'object') {
    return NextResponse.json({ message: 'Malformed submission' }, { status: 400 });
  }

  const result = await submitToPublicForm(slug, {
    formVersionId: body.formVersionId,
    idempotencyKey: body.idempotencyKey,
    answers: body.answers,
    files: Array.isArray(body.files) ? body.files : [],
    submitterEmail: typeof body.answers?.email === 'string' ? body.answers.email : undefined,
    submitterIp: ip === 'unknown' ? undefined : ip,
  });

  if (!result.ok) {
    const status = result.reason === 'not-found' ? 404 : result.reason === 'stale-version' ? 409 : 403;
    return NextResponse.json({ message: REASON_MESSAGES[result.reason] }, { status });
  }

  return NextResponse.json({ submissionId: result.submissionId }, { status: result.alreadyExisted ? 200 : 201 });
}
