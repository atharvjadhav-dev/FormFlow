import { and, desc, eq, ilike, sql } from 'drizzle-orm';
import { withOrg } from '@/db/client';
import { submissions, forms, submissionStatusEnum } from '@/db/schema';
import { SubmissionsTable } from '@/components/dashboard/submissions-table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { requireOrgAuth } from '@/lib/auth';
import { Download, Search, Inbox, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import Link from 'next/link';

const PAGE_SIZE = 20;

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; formId?: string; page?: string }>;
}) {
  const { orgId } = await requireOrgAuth();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const { rows, total, formOptions } = await withOrg(orgId, async (tx) => {
    const conditions = [eq(submissions.orgId, orgId)];
    if (params.status) conditions.push(eq(submissions.status, params.status as (typeof submissionStatusEnum.enumValues)[number]));
    if (params.formId) conditions.push(eq(submissions.formId, params.formId));
    if (params.q) conditions.push(ilike(submissions.submitterEmail, `%${params.q}%`));

    const [{ value: total }] = await tx.select({ value: sql<number>`count(*)::int` }).from(submissions).where(and(...conditions));

    const rows = await tx
      .select({
        id: submissions.id,
        status: submissions.status,
        submitterEmail: submissions.submitterEmail,
        submittedAt: submissions.submittedAt,
        formName: forms.name,
      })
      .from(submissions)
      .innerJoin(forms, eq(forms.id, submissions.formId))
      .where(and(...conditions))
      .orderBy(desc(submissions.submittedAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE);

    const formOptions = await tx.select({ id: forms.id, name: forms.name }).from(forms);

    return { rows, total, formOptions };
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const exportParams = new URLSearchParams();
  if (params.status) exportParams.set('status', params.status);
  if (params.formId) exportParams.set('formId', params.formId);

  function pageUrl(targetPage: number) {
    const usp = new URLSearchParams();
    if (params.q) usp.set('q', params.q);
    if (params.status) usp.set('status', params.status);
    if (params.formId) usp.set('formId', params.formId);
    usp.set('page', String(targetPage));
    return `?${usp.toString()}`;
  }

  const hasActiveFilters = Boolean(params.q || params.status || params.formId);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-[#1D1D1F]">Submissions</h1>
            <span className="rounded-full bg-black/[0.05] px-2.5 py-0.5 text-xs font-semibold text-[#86868B]">
              {total} Total
            </span>
          </div>
          <p className="mt-1 text-xs text-[#86868B]">
            Review, verify, and export responses collected across all your forms.
          </p>
        </div>

        <a href={`/api/submissions/export?${exportParams.toString()}`}>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full border-black/[0.08] bg-white px-4 py-2 text-xs font-semibold text-[#1D1D1F] shadow-sm hover:bg-[#F5F5F7] active:scale-95"
          >
            <Download className="h-3.5 w-3.5 mr-1.5 text-[#86868B]" />
            Export CSV
          </Button>
        </a>
      </div>

      {/* Filter Strip */}
      <form
        className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-black/[0.06] bg-white/80 p-3 shadow-apple backdrop-blur-md"
        method="get"
      >
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#86868B]" />
          <input
            name="q"
            placeholder="Filter by email address..."
            defaultValue={params.q}
            className="h-9 w-full rounded-xl border border-black/[0.08] bg-[#F5F5F7]/80 pl-9 pr-3 text-xs text-[#1D1D1F] placeholder-[#86868B] focus:border-[#007AFF] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007AFF]/15"
          />
        </div>

        <select
          name="status"
          defaultValue={params.status ?? ''}
          className="h-9 rounded-xl border border-black/[0.08] bg-[#F5F5F7]/80 px-3 text-xs font-medium text-[#1D1D1F] focus:border-[#007AFF] focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="under_review">Under Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>

        <select
          name="formId"
          defaultValue={params.formId ?? ''}
          className="h-9 rounded-xl border border-black/[0.08] bg-[#F5F5F7]/80 px-3 text-xs font-medium text-[#1D1D1F] focus:border-[#007AFF] focus:outline-none max-w-[200px] truncate"
        >
          <option value="">All Forms</option>
          {formOptions.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>

        <Button
          type="submit"
          size="sm"
          className="rounded-full bg-[#007AFF] text-white hover:bg-[#0071E3] text-xs px-4 h-9 shadow-apple-hover"
        >
          <Filter className="h-3 w-3 mr-1" />
          Filter
        </Button>

        {hasActiveFilters && (
          <Link
            href="/dashboard/submissions"
            className="rounded-full bg-[#F5F5F7] px-3 py-1.5 text-xs font-medium text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#E5E5EA] transition-all"
          >
            Reset
          </Link>
        )}
      </form>

      {/* Main Content Area */}
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-black/[0.08] bg-white/60 p-12 text-center backdrop-blur-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F5F5F7] text-[#86868B] mb-3">
            <Inbox className="h-7 w-7" />
          </div>
          <p className="text-base font-semibold text-[#1D1D1F]">No submissions found</p>
          <p className="mt-1 max-w-sm text-xs text-[#86868B]">
            {hasActiveFilters
              ? 'No records match your selected filters. Try clearing filters to see all entries.'
              : 'Share your published form link to start collecting and reviewing real-time responses.'}
          </p>
          {hasActiveFilters && (
            <Link
              href="/dashboard/submissions"
              className="mt-4 rounded-full bg-[#007AFF] px-4 py-2 text-xs font-semibold text-white shadow-apple hover:bg-[#0071E3] transition-all"
            >
              Clear Filters
            </Link>
          )}
        </div>
      ) : (
        <>
          <SubmissionsTable
            rows={rows.map((r) => ({ ...r, submittedAt: r.submittedAt.toISOString() }))}
          />

          {/* Pagination */}
          <div className="flex items-center justify-between pt-2 text-xs text-[#86868B]">
            <span>
              Showing Page <span className="font-semibold text-[#1D1D1F]">{page}</span> of{' '}
              <span className="font-semibold text-[#1D1D1F]">{totalPages}</span> · {total} total
            </span>

            <div className="flex items-center gap-2">
              {page > 1 && (
                <a href={pageUrl(page - 1)}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full border-black/[0.08] bg-white px-3 py-1.5 text-xs font-medium text-[#1D1D1F] hover:bg-[#F5F5F7] shadow-sm active:scale-95"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                    Previous
                  </Button>
                </a>
              )}
              {page < totalPages && (
                <a href={pageUrl(page + 1)}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full border-black/[0.08] bg-white px-3 py-1.5 text-xs font-medium text-[#1D1D1F] hover:bg-[#F5F5F7] shadow-sm active:scale-95"
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </a>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

