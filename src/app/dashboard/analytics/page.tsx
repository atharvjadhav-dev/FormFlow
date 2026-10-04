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
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-6 sm:py-10 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1D1D1F]">Analytics</h1>
        <p className="mt-0.5 text-xs sm:text-sm text-[#86868B]">
          Performance breakdown across submission statuses and active forms.
        </p>
      </div>

      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#86868B]">
          Submissions by status
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
          {(['pending', 'under_review', 'approved', 'rejected'] as const).map((status) => (
            <div key={status} className="rounded-2xl border border-black/[0.06] bg-white p-3.5 sm:p-4 shadow-apple">
              <p className="text-xl sm:text-2xl font-bold tracking-tight text-[#1D1D1F] tabular-nums">
                {statusMap[status] ?? 0}
              </p>
              <p className="text-xs capitalize text-[#86868B] mt-0.5 truncate">
                {status.replace('_', ' ')}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#86868B]">
          Submissions by form
        </h2>
        {byForm.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/[0.08] bg-white p-8 text-center text-xs text-[#86868B]">
            No forms or submissions recorded yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-apple divide-y divide-black/[0.04]">
            {byForm.map((row) => (
              <div key={row.formId} className="flex items-center justify-between gap-3 px-4 py-3 text-xs">
                <span className="font-medium text-[#1D1D1F] truncate min-w-0 flex-1">
                  {row.formName}
                </span>
                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="h-2 w-20 sm:w-32 overflow-hidden rounded-full bg-black/[0.05]">
                    <div
                      className="h-full bg-[#007AFF] rounded-full transition-all"
                      style={{ width: `${totalSubmissions ? (row.count / totalSubmissions) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="w-7 text-right font-semibold text-[#1D1D1F] tabular-nums">
                    {row.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
