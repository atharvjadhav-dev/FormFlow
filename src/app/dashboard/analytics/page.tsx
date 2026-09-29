import { eq, sql } from 'drizzle-orm';
import { withOrg } from '@/db/client';
import { forms, submissions } from '@/db/schema';
import { requireOrgAuth } from '@/lib/auth';

export default async function AnalyticsPage() {
  const { orgId } = await requireOrgAuth();

  const { byForm, byStatus } = await withOrg(orgId, async (tx) => {
    const byForm = await tx
      .select({
        formId: forms.id,
        formName: forms.name,
        count: sql<number>`count(${submissions.id})::int`,
      })
      .from(forms)
      .leftJoin(submissions, eq(submissions.formId, forms.id))
      .where(eq(forms.orgId, orgId))
      .groupBy(forms.id, forms.name)
      .orderBy(sql`count(${submissions.id}) desc`);

    const byStatus = await tx
      .select({ status: submissions.status, count: sql<number>`count(*)::int` })
      .from(submissions)
      .where(eq(submissions.orgId, orgId))
      .groupBy(submissions.status);

    return { byForm, byStatus };
  });

  const statusMap = Object.fromEntries(byStatus.map((s) => [s.status, s.count]));
  const totalSubmissions = byStatus.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-6 text-xl font-semibold text-foreground">Analytics</h1>

      <h2 className="mb-3 text-sm font-semibold text-foreground">Submissions by status</h2>
      <div className="mb-8 grid grid-cols-4 gap-4">
        {(['pending', 'under_review', 'approved', 'rejected'] as const).map((status) => (
          <div key={status} className="rounded-lg border border-border bg-card p-4">
            <p className="text-2xl font-semibold text-foreground">{statusMap[status] ?? 0}</p>
            <p className="text-sm capitalize text-muted-foreground">{status.replace('_', ' ')}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-3 text-sm font-semibold text-foreground">Submissions by form</h2>
      {byForm.length === 0 ? (
        <p className="text-sm text-muted-foreground">No forms yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          {byForm.map((row) => (
            <div key={row.formId} className="flex items-center justify-between border-b border-border px-4 py-2.5 text-sm last:border-b-0">
              <span className="text-foreground">{row.formName}</span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${totalSubmissions ? (row.count / totalSubmissions) * 100 : 0}%` }}
                  />
                </div>
                <span className="w-6 text-right text-muted-foreground">{row.count}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
