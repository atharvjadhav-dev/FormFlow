import { eq, desc, count } from 'drizzle-orm';
import Link from 'next/link';
import { withOrg } from '@/db/client';
import { forms, submissions } from '@/db/schema';
import { requireOrgAuth } from '@/lib/auth';
import { CopyLinkButton, ShareDialog } from '@/components/forms/share-dialog';
import { StatusPill } from '@/components/dashboard/submissions-table';

export default async function OverviewPage() {
  const { orgId } = await requireOrgAuth();

  const { formCount, submissionCount, pendingCount, recent, latestForm } = await withOrg(orgId, async (tx) => {
    const [{ value: formCount }] = await tx.select({ value: count() }).from(forms);
    const [{ value: submissionCount }] = await tx.select({ value: count() }).from(submissions);
    const [{ value: pendingCount }] = await tx
      .select({ value: count() })
      .from(submissions)
      .where(eq(submissions.status, 'pending'));
    const recent = await tx
      .select({ id: submissions.id, formId: submissions.formId, submittedAt: submissions.submittedAt, status: submissions.status, submitterEmail: submissions.submitterEmail })
      .from(submissions)
      .orderBy(desc(submissions.submittedAt))
      .limit(5);
    const [latestForm] = await tx
      .select({ id: forms.id, name: forms.name, slug: forms.slug })
      .from(forms)
      .where(eq(forms.status, 'published'))
      .orderBy(desc(forms.updatedAt))
      .limit(1);

    return { formCount, submissionCount, pendingCount, recent, latestForm };
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      {/* Header with live status badge */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1D1D1F]">Workspace Overview</h1>
          <p className="mt-1 text-sm text-[#86868B]">
            Real-time analytics and application performance
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto bg-white/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-black/[0.06] shadow-sm">
          <span className="h-2 w-2 rounded-full bg-[#34C759] animate-pulse" />
          <span className="text-xs font-semibold text-[#1D1D1F]">
            {formCount > 0 ? `${formCount} Form${formCount > 1 ? 's' : ''} Online` : 'System Ready'}
          </span>
          <span className="text-xs text-[#86868B]">· Local Storage Active</span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="rounded-3xl bg-white p-6 shadow-apple shadow-apple-hover border border-black/[0.04] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#86868B]">Total Forms</span>
            <div className="h-8 w-8 rounded-full bg-[#007AFF]/10 flex items-center justify-center text-[#007AFF]">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold tracking-tight text-[#1D1D1F]">{formCount}</p>
            <p className="mt-1 text-xs text-[#86868B] flex items-center gap-1.5">
              <span className="text-[#34C759] font-medium">Ready</span> to accept applicant responses
            </p>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-apple shadow-apple-hover border border-black/[0.04] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#86868B]">Total Submissions</span>
            <div className="h-8 w-8 rounded-full bg-[#34C759]/10 flex items-center justify-center text-[#34C759]">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold tracking-tight text-[#1D1D1F]">{submissionCount}</p>
            <p className="mt-1 text-xs text-[#86868B]">
              Across all published forms
            </p>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-apple shadow-apple-hover border border-black/[0.04] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#86868B]">Pending Review</span>
            <div className="h-8 w-8 rounded-full bg-[#FF9500]/10 flex items-center justify-center text-[#FF9500]">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold tracking-tight text-[#1D1D1F]">{pendingCount}</p>
            <p className="mt-1 text-xs text-[#86868B]">
              Awaiting review from admins
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions Strip */}
      <div className="mb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#86868B]">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/dashboard/forms/new"
            className="group rounded-2xl bg-white p-4 border border-black/[0.05] shadow-apple shadow-apple-hover flex items-center gap-3.5"
          >
            <div className="h-10 w-10 rounded-full bg-[#007AFF] text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform shrink-0">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1D1D1F] group-hover:text-[#007AFF] transition-colors">Create Form</p>
              <p className="text-xs text-[#86868B]">Design fields and publish</p>
            </div>
          </Link>

          {latestForm ? (
            <div className="rounded-2xl bg-white p-4 border border-black/[0.05] shadow-apple shadow-apple-hover flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <p className="text-sm font-semibold text-[#1D1D1F] truncate">{latestForm.name}</p>
                <p className="text-xs text-[#86868B] font-mono truncate">/f/{latestForm.slug}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <CopyLinkButton slug={latestForm.slug} />
                <ShareDialog formTitle={latestForm.name} slug={latestForm.slug} />
              </div>
            </div>
          ) : (
            <Link
              href="/dashboard/forms"
              className="group rounded-2xl bg-white p-4 border border-black/[0.05] shadow-apple shadow-apple-hover flex items-center gap-3.5"
            >
              <div className="h-10 w-10 rounded-full bg-[#34C759] text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform shrink-0">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#1D1D1F] group-hover:text-[#34C759] transition-colors">Instant Share</p>
                <p className="text-xs text-[#86868B]">Publish a form to share</p>
              </div>
            </Link>
          )}

          <Link
            href="/dashboard/submissions"
            className="group rounded-2xl bg-white p-4 border border-black/[0.05] shadow-apple shadow-apple-hover flex items-center gap-3.5"
          >
            <div className="h-10 w-10 rounded-full bg-[#1D1D1F] text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform shrink-0">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1D1D1F] group-hover:text-[#007AFF] transition-colors">Submissions Hub</p>
              <p className="text-xs text-[#86868B]">Review applicant files</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Activity / Submissions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#86868B]">Recent Activity</h2>
          {recent.length > 0 && (
            <Link href="/dashboard/submissions" className="text-xs font-medium text-[#007AFF] hover:underline">
              View all &rarr;
            </Link>
          )}
        </div>

        {recent.length === 0 ? (
          <div className="rounded-3xl border border-black/[0.06] bg-white p-10 text-center shadow-apple">
            <div className="mx-auto h-12 w-12 rounded-full bg-black/[0.04] flex items-center justify-center text-[#86868B] mb-3">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="font-semibold text-[#1D1D1F] text-base">No submissions yet</p>
            <p className="mt-1 text-sm text-[#86868B] max-w-sm mx-auto">
              Once visitors fill out your public form link, their submitted answers and uploaded documents will appear here instantly.
            </p>
            <div className="mt-5">
              <Link
                href="/dashboard/forms"
                className="inline-flex items-center gap-2 rounded-full bg-[#007AFF] text-white px-5 py-2.5 text-xs font-semibold shadow-sm hover:bg-[#0071E3] active:scale-[0.97] transition-all"
              >
                Go to Forms &rarr;
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-black/[0.05] bg-white shadow-apple overflow-hidden divide-y divide-black/[0.04]">
            {recent.map((s) => (
              <Link
                key={s.id}
                href={`/dashboard/submissions/${s.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-[#F5F5F7]/60 transition-colors group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="h-8 w-8 rounded-full bg-[#007AFF]/10 flex items-center justify-center text-[#007AFF] font-medium text-xs">
                    {(s.submitterEmail ?? 'S')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1D1D1F] group-hover:text-[#007AFF] transition-colors">
                      {s.submitterEmail ?? 'Applicant Submission'}
                    </p>
                    <p className="text-xs text-[#86868B]">
                      {new Date(s.submittedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <StatusPill status={s.status} />
                  <span className="text-[#86868B] group-hover:translate-x-0.5 transition-transform text-sm">&rarr;</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
