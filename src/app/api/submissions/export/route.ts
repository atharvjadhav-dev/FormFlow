import { and, eq, desc } from 'drizzle-orm';
import { withOrg } from '@/db/client';
import { submissions, formVersions, type FormSchema } from '@/db/schema';
import { requireOrgAuth } from '@/lib/auth';

export const runtime = 'nodejs';

function csvEscape(value: unknown): string {
  let s = value == null ? '' : String(value);
  if (/^[=+\-@]/.test(s)) {
    s = `'${s}`;
  }
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: Request) {
  const { orgId } = await requireOrgAuth();

  const url = new URL(req.url);
  const formId = url.searchParams.get('formId') ?? undefined;
  const status = url.searchParams.get('status') ?? undefined;

  const csv = await withOrg(orgId, async (tx) => {
    const conditions = [eq(submissions.orgId, orgId)];
    if (formId) conditions.push(eq(submissions.formId, formId));
    if (status) conditions.push(eq(submissions.status, status as 'pending' | 'under_review' | 'approved' | 'rejected'));

    const rows = await tx
      .select({
        id: submissions.id,
        formId: submissions.formId,
        formVersionId: submissions.formVersionId,
        status: submissions.status,
        submitterEmail: submissions.submitterEmail,
        submittedAt: submissions.submittedAt,
        answers: submissions.answers,
      })
      .from(submissions)
      .where(and(...conditions))
      .orderBy(desc(submissions.submittedAt));

    // Single-form export: use that form's published schema for readable,
    // stable column headers (field labels) in field order.
    if (formId) {
      const [version] = await tx
        .select()
        .from(formVersions)
        .where(and(eq(formVersions.formId, formId), eq(formVersions.status, 'published')))
        .limit(1);
      const fields = ((version?.schema as FormSchema | undefined)?.fields ?? []).filter(
        (f) => f.type !== 'heading' && f.type !== 'paragraph' && f.type !== 'divider',
      );

      const header = ['Submitted at', 'Status', 'Submitter email', ...fields.map((f) => f.label)];
      const lines = rows.map((r) => {
        const answers = r.answers as Record<string, unknown>;
        const cells = [
          r.submittedAt.toISOString(),
          r.status,
          r.submitterEmail ?? '',
          ...fields.map((f) => {
            const v = answers[f.id];
            return Array.isArray(v) ? v.join('; ') : (v ?? '');
          }),
        ];
        return cells.map(csvEscape).join(',');
      });
      return [header.map(csvEscape).join(','), ...lines].join('\n');
    }

    // Cross-form export: schemas differ, so answers travel as a JSON blob.
    const header = ['Submitted at', 'Form ID', 'Status', 'Submitter email', 'Answers (JSON)'];
    const lines = rows.map((r) =>
      [r.submittedAt.toISOString(), r.formId, r.status, r.submitterEmail ?? '', JSON.stringify(r.answers)].map(csvEscape).join(','),
    );
    return [header.map(csvEscape).join(','), ...lines].join('\n');
  });

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="submissions-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
