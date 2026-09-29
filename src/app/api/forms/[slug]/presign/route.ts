import { NextResponse } from 'next/server';
import { getPublicForm } from '@/db/public';
import { getFormAvailability } from '@/lib/availability';
import { createPresignedUploadUrl } from '@/lib/s3';
import { checkRateLimit, PRESIGN_RATE_LIMIT } from '@/lib/rate-limit';
import type { FormSchema } from '@/db/schema';

export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  const { allowed } = await checkRateLimit(`presign:${slug}:${ip}`, PRESIGN_RATE_LIMIT.limit, PRESIGN_RATE_LIMIT.windowSeconds);
  if (!allowed) {
    return NextResponse.json({ message: 'Too many uploads — please wait a moment.' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.fieldId || !body?.fileName || !body?.mimeType || typeof body.sizeBytes !== 'number') {
    return NextResponse.json({ message: 'Missing fieldId, fileName, mimeType, or sizeBytes' }, { status: 400 });
  }

  const data = await getPublicForm(slug);
  if (!data) return NextResponse.json({ message: 'Form not found' }, { status: 404 });
  if (getFormAvailability(data.publishedVersion) !== 'open') {
    return NextResponse.json({ message: 'This form is not currently accepting submissions' }, { status: 403 });
  }

  const schema = data.publishedVersion!.schema as FormSchema;
  const field = schema.fields.find((f) => f.id === body.fieldId);
  if (!field || (field.type !== 'file' && field.type !== 'image') || !field.file) {
    return NextResponse.json({ message: 'Not a file field on this form' }, { status: 400 });
  }

  const accepted = field.file.acceptedMimeTypes ?? [];
  const matchesAccepted =
    accepted.length === 0 ||
    accepted.includes('*/*') ||
    accepted.some((type) => {
      const lowerType = type.toLowerCase().trim();
      const lowerBody = body.mimeType.toLowerCase().trim();
      if (lowerType === lowerBody) return true;
      if (lowerType.endsWith('/*') && lowerBody.startsWith(lowerType.slice(0, -1))) return true;
      if (lowerType === 'image/jpeg' && lowerBody === 'image/jpg') return true;
      if (lowerType === 'image/jpg' && lowerBody === 'image/jpeg') return true;
      if ((lowerType === 'application/pdf' || lowerType === 'pdf') && lowerBody === 'application/x-pdf') return true;
      return false;
    });

  if (!matchesAccepted) {
    return NextResponse.json({ message: `${body.mimeType} is not an accepted file type for this field (accepted: ${accepted.join(', ')})` }, { status: 400 });
  }
  const maxBytes = field.file.maxSizeMb * 1024 * 1024;
  if (body.sizeBytes > maxBytes) {
    return NextResponse.json({ message: `File exceeds the ${field.file.maxSizeMb}MB limit for this field` }, { status: 400 });
  }

  const { uploadUrl, s3Key } = await createPresignedUploadUrl({
    orgId: data.form.orgId,
    formId: data.form.id,
    fieldId: body.fieldId,
    fileName: body.fileName,
    mimeType: body.mimeType,
    sizeBytes: body.sizeBytes,
  });

  return NextResponse.json({ uploadUrl, s3Key });
}
