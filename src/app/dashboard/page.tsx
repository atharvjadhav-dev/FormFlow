import { eq, desc, count } from 'drizzle-orm';
import Link from 'next/link';
import { withOrg } from '@/db/client';
import { forms, submissions } from '@/db/schema';
import { requireOrgAuth } from '@/lib/auth';
import { CopyLinkButton, ShareDialog } from '@/components/forms/share-dialog';
import { StatusPill } from '@/components/dashboard/submissions-table';
import { FileText, CheckCircle2, Clock, Plus, Inbox, ChevronRight, Sparkles } from 'lucide-react';

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

  const stats = [
    { label: 'Forms', value: formCount, hint: 'Ready to accept responses', icon: FileText, tint: 'text-[#007AFF] bg-[#007AFF]/10', href: '/dashboard/forms' },
    { label: 'Responses', value: submissionCount, hint: 'Across all published forms', icon: CheckCircle2, tint: 'text-[#34C759] bg-[#34C759]/10', href: '/dashboard/submissions' },
    { label: 'Pending', value: pendingCount, hint: 'Awaiting review', icon: Clock, tint: 'text-[#FF9500] bg-[#FF9500]/10', href: '/dashboard/submissions?status=pending' },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-5 sm:py-10 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1D1D1F]">Overview</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-[#86868B]">Your workspace at a glance</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-black/[0.06] bg-white px-3 py-1 text-[11px] sm:text-xs font-semibold text-[#1D1D1F] shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-[#34C759]" />
          {formCount > 0 ? `${formCount} live` : 'Ready'}
        </span>
      </div>

      {/* Stats — compact 3-up on phones, full cards on larger screens */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-5">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.label}
              href={s.href}
              className="min-w-0 rounded-2xl sm:rounded-3xl border border-black/[0.04] bg-white p-3 sm:p-6 shadow-apple shadow-apple-hover"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-[#86868B]">
                  {s.label}
                </span>
                <span className={`hidden sm:flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${s.tint}`}>
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-1.5 sm:mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-[#1D1D1F] tabular-nums">
                {s.value}
              </p>
              <p className="hidden sm:block mt-1 text-xs text-[#86868B]">{s.hint}</p>
            </Link>
          );
        })}
      </div>

      {/* Quick actions */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#86868B]">Quick actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4">
          <Link
            href="/dashboard/forms/new"
            className="group flex items-center gap-3.5 rounded-2xl border border-black/[0.05] bg-white p-4 shadow-apple shadow-apple-hover"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#007AFF] text-white shadow-sm transition-transform group-hover:scale-105">
              <Plus className="h-5 w-5 stroke-[2.5]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-[#1D1D1F] group-hover:text-[#007AFF] transition-colors">Create form</span>
              <span className="block truncate text-xs text-[#86868B]">Blank, AI, or template</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-[#C7C7CC] sm:hidden" />
          </Link>

          {latestForm ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-black/[0.05] bg-white p-4 shadow-apple">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B]">Latest published</p>
                <p className="mt-0.5 truncate text-sm font-semibold text-[#1D1D1F]">{latestForm.name}</p>
                <p className="truncate font-mono text-xs text-[#86868B]">/f/{latestForm.slug}</p>
              </div>
              <div className="flex items-center gap-2">
                <CopyLinkButton slug={latestForm.slug} />
                <ShareDialog formTitle={latestForm.name} slug={latestForm.slug} />
              </div>
            </div>
          ) : (
            <Link
              href="/dashboard/forms/new?mode=ai"
              className="group flex items-center gap-3.5 rounded-2xl border border-black/[0.05] bg-white p-4 shadow-apple shadow-apple-hover"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#007AFF]/10 text-[#007AFF] transition-transform group-hover:scale-105">
                <Sparkles className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[#1D1D1F] group-hover:text-[#007AFF] transition-colors">Create with AI</span>
                <span className="block truncate text-xs text-[#86868B]">Describe it, we build it</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-[#C7C7CC] sm:hidden" />
            </Link>
          )}

          <Link
            href="/dashboard/submissions"
            className="group flex items-center gap-3.5 rounded-2xl border border-black/[0.05] bg-white p-4 shadow-apple shadow-apple-hover"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1D1D1F] text-white shadow-sm transition-transform group-hover:scale-105">
              <Inbox className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-[#1D1D1F] group-hover:text-[#007AFF] transition-colors">Submissions</span>
              <span className="block truncate text-xs text-[#86868B]">Review responses &amp; files</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-[#C7C7CC] sm:hidden" />
          </Link>
        </div>
      </section>

      {/* Recent activity */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#86868B]">Recent activity</h2>
          {recent.length > 0 && (
            <Link href="/dashboard/submissions" className="shrink-0 text-xs font-medium text-[#007AFF] hover:underline">
              View all
            </Link>
          )}
        </div>

        {recent.length === 0 ? (
          <div className="rounded-2xl sm:rounded-3xl border border-black/[0.06] bg-white px-5 py-10 text-center shadow-apple">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-black/[0.04] text-[#86868B]">
              <Inbox className="h-6 w-6" />
            </div>
            <p className="text-base font-semibold text-[#1D1D1F]">No submissions yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-[#86868B]">
              When people fill out your published forms, their answers will show up here.
            </p>
            <Link
              href="/dashboard/forms"
              className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[#007AFF] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[#0071E3] active:scale-[0.97]"
            >
              Go to forms
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-black/[0.04] overflow-hidden rounded-2xl sm:rounded-3xl border border-black/[0.05] bg-white shadow-apple">
            {recent.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/dashboard/submissions/${s.id}`}
                  className="group flex items-center gap-3 px-4 sm:px-6 py-3.5 transition-colors hover:bg-[#F5F5F7]/60 active:bg-[#F5F5F7]"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#007AFF]/10 text-xs font-medium text-[#007AFF]">
                    {(s.submitterEmail ?? 'A')[0].toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[#1D1D1F] group-hover:text-[#007AFF] transition-colors">
                      {s.submitterEmail ?? 'Anonymous'}
                    </span>
                    <span className="block text-xs text-[#86868B]">
                      {new Date(s.submittedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </span>
                  <span className="shrink-0">
                    <StatusPill status={s.status} />
                  </span>
                  <ChevronRight className="hidden sm:block h-4 w-4 shrink-0 text-[#C7C7CC] transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
