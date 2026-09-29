import { and, desc, eq } from 'drizzle-orm';
import { dbService } from './client';
import { forms, formVersions, organizations, submissions, submissionFiles, auditLogs } from './schema';
import { getFormAvailability } from '@/lib/availability';
import { redis } from '@/lib/redis';
import { enqueueSubmissionCreated } from '@/lib/sqs';

const PUBLIC_FORM_CACHE_TTL_SECONDS = 30;

export async function invalidatePublicFormCache(slug: string) {
  await redis.del(`form:public:${slug}`).catch(() => {}); // caching is an optimization, never a hard dependency
}

export type SubmitResult =
  | { ok: true; submissionId: string; alreadyExisted: boolean }
  | { ok: false; reason: 'not-found' | 'not-yet-open' | 'closed' | 'stale-version' };

export interface SubmitFilePayload {
  fieldId: string;
  s3Key: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

/**
 * The only way a submission row is ever created. Re-checks the active
 * window against the server clock (never trusts that the page was open a
 * minute ago) and re-checks that formVersionId is still the form's current
 * published version, so a stale tab can't submit against a schema the admin
 * has since replaced. Idempotency is enforced by the DB unique constraint on
 * (form_id, idempotency_key) — a retry lands here again and is treated as a
 * success rather than an error.
 */
export async function submitToPublicForm(
  slug: string,
  input: {
    formVersionId: string;
    idempotencyKey: string;
    answers: Record<string, unknown>;
    files: SubmitFilePayload[];
    submitterEmail?: string;
    submitterIp?: string;
  },
): Promise<SubmitResult> {
  const [form] = await dbService.select().from(forms).where(eq(forms.slug, slug)).limit(1);
  if (!form) return { ok: false, reason: 'not-found' };

  const [currentVersion] = await dbService
    .select()
    .from(formVersions)
    .where(and(eq(formVersions.formId, form.id), eq(formVersions.status, 'published')))
    .orderBy(desc(formVersions.versionNumber))
    .limit(1);

  const availability = getFormAvailability(currentVersion ?? null);
  if (availability !== 'open') return { ok: false, reason: availability === 'not-found' ? 'not-found' : availability };
  if (currentVersion!.id !== input.formVersionId) return { ok: false, reason: 'stale-version' };

  const [existing] = await dbService
    .select()
    .from(submissions)
    .where(and(eq(submissions.formId, form.id), eq(submissions.idempotencyKey, input.idempotencyKey)))
    .limit(1);
  if (existing) return { ok: true, submissionId: existing.id, alreadyExisted: true };

  const [created] = await dbService
    .insert(submissions)
    .values({
      orgId: form.orgId,
      formId: form.id,
      formVersionId: currentVersion!.id,
      idempotencyKey: input.idempotencyKey,
      answers: input.answers,
      submitterEmail: input.submitterEmail,
      submitterIp: input.submitterIp,
    })
    .onConflictDoNothing({ target: [submissions.formId, submissions.idempotencyKey] })
    .returning();

  // onConflictDoNothing racing another concurrent identical request: re-fetch instead of assuming `created` exists.
  const submissionId =
    created?.id ??
    (
      await dbService
        .select()
        .from(submissions)
        .where(and(eq(submissions.formId, form.id), eq(submissions.idempotencyKey, input.idempotencyKey)))
        .limit(1)
    )[0].id;

  if (created && input.files.length > 0) {
    await dbService.insert(submissionFiles).values(
      input.files.map((f) => ({
        orgId: form.orgId,
        submissionId,
        fieldId: f.fieldId,
        s3Key: f.s3Key,
        fileName: f.fileName,
        mimeType: f.mimeType,
        sizeBytes: f.sizeBytes,
      })),
    );
  }

  if (created) {
    await dbService.insert(auditLogs).values({
      orgId: form.orgId,
      actorId: 'public',
      action: 'submission.created',
      targetType: 'submission',
      targetId: submissionId,
      metadata: { formId: form.id },
    });

    await enqueueSubmissionCreated({ type: 'submission.created', orgId: form.orgId, formId: form.id, submissionId });
  }

  return { ok: true, submissionId, alreadyExisted: !created };
}

/**
 * Looks up a form for the public /f/[slug] page. Runs on the service
 * connection (BYPASSRLS) because there is no tenant context for an
 * anonymous visitor — but the only thing returned is exactly what an
 * applicant is meant to see: the form's current published version. This is
 * intentionally public data, not a bypass of the isolation model; nothing
 * here ever returns another form's submissions or a draft version.
 */
export async function getPublicForm(slug: string) {
  const cacheKey = `form:public:${slug}`;
  const cached = await redis.get(cacheKey).catch(() => null);
  if (cached) {
    const parsed = JSON.parse(cached) as ReturnType<typeof serializePublicForm>;
    return deserializePublicForm(parsed);
  }

  const [form] = await dbService.select().from(forms).where(eq(forms.slug, slug)).limit(1);
  if (!form) return null;

  const [org] = await dbService.select().from(organizations).where(eq(organizations.id, form.orgId)).limit(1);

  const [publishedVersion] = await dbService
    .select()
    .from(formVersions)
    .where(and(eq(formVersions.formId, form.id), eq(formVersions.status, 'published')))
    .orderBy(desc(formVersions.versionNumber))
    .limit(1);

  const result = { form, org, publishedVersion: publishedVersion ?? null };

  // Cache even a "no published version" result — a not-yet-published form
  // getting hammered shouldn't hit Postgres on every request either.
  await redis
    .set(cacheKey, JSON.stringify(serializePublicForm(result)), 'EX', PUBLIC_FORM_CACHE_TTL_SECONDS)
    .catch(() => {});

  return result;
}

function serializePublicForm(result: { form: typeof forms.$inferSelect; org: typeof organizations.$inferSelect | undefined; publishedVersion: typeof formVersions.$inferSelect | null }) {
  return result;
}

function deserializePublicForm(parsed: ReturnType<typeof serializePublicForm>) {
  // Dates survive JSON as strings — rehydrate the ones downstream code compares against `new Date()`.
  return {
    ...parsed,
    publishedVersion: parsed.publishedVersion
      ? {
          ...parsed.publishedVersion,
          startAt: parsed.publishedVersion.startAt ? new Date(parsed.publishedVersion.startAt) : null,
          endAt: parsed.publishedVersion.endAt ? new Date(parsed.publishedVersion.endAt) : null,
        }
      : null,
  };
}
