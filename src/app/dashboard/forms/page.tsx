import { eq, desc, sql } from 'drizzle-orm';
import Link from 'next/link';
import { withOrg } from '@/db/client';
import { forms, formVersions, submissions } from '@/db/schema';
import { createForm } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { requireOrgAuth } from '@/lib/auth';
import { ShareDialog, CopyLinkButton } from '@/components/forms/share-dialog';
import { DeleteFormDialog } from '@/components/forms/delete-form-dialog';

export default async function FormsPage() {
  const { orgId } = await requireOrgAuth();

  const orgForms = await withOrg(orgId, (tx) =>
    tx
      .select({
        id: forms.id,
        name: forms.name,
        slug: forms.slug,
        status: forms.status,
        updatedAt: forms.updatedAt,
        submissionCount: sql<number>`count(${submissions.id})::int`,
        startAt: formVersions.startAt,
        endAt: formVersions.endAt,
        timezone: formVersions.timezone,
      })
      .from(forms)
      .leftJoin(submissions, eq(submissions.formId, forms.id))
      .leftJoin(formVersions, eq(formVersions.id, forms.currentPublishedVersionId))
      .where(eq(forms.orgId, orgId))
      .groupBy(forms.id, formVersions.startAt, formVersions.endAt, formVersions.timezone)
      .orderBy(desc(forms.updatedAt)),
  );

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      {/* Header & Create bar */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1D1D1F]">Forms</h1>
          <p className="text-sm text-[#86868B] mt-0.5">
            Create, publish, and distribute zero-friction forms to applicants
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/dashboard/forms/new?mode=ai"
            className="flex h-9 items-center gap-1.5 rounded-full border border-blue-500/25 bg-blue-50/50 px-3.5 text-xs font-semibold text-[#007AFF] hover:bg-blue-100/60 transition-colors"
          >
            <span>✨ Create with AI</span>
          </Link>

          <Link
            href="/dashboard/forms/new"
            className="flex h-9 items-center gap-1.5 rounded-full bg-[#007AFF] px-4 text-xs font-semibold text-white shadow-xs hover:bg-[#0071E3] transition-colors"
          >
            <span>+ Create Form</span>
          </Link>

          <form action={createForm} className="hidden sm:flex items-center gap-2 bg-white p-1 rounded-full border border-black/[0.06] shadow-apple">
            <input
              id="quick-create-form-name"
              name="name"
              aria-label="Quick title for blank form"
              placeholder="Quick title..."
              className="w-36 bg-transparent px-3 text-xs text-[#1D1D1F] placeholder:text-[#86868B] focus:outline-none"
            />
            <Button type="submit" size="sm" className="rounded-full shadow-xs text-xs h-7 px-3">
              Blank
            </Button>
          </form>
        </div>
      </div>

      {/* Forms Deck */}
      {orgForms.length === 0 ? (
        <div className="rounded-3xl border border-black/[0.06] py-16 px-6 text-center bg-white shadow-apple">
          <div className="mx-auto h-12 w-12 rounded-full bg-black/[0.04] flex items-center justify-center text-[#86868B] mb-3">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="font-bold text-[#1D1D1F] text-lg">No forms yet</p>
          <p className="mt-1 text-sm text-[#86868B] max-w-md mx-auto">
            Type a title in the top bar or click one of the starter templates below to begin.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5 mb-12">
          {orgForms.map((form) => (
            <div
              key={form.id}
              className="rounded-3xl border border-black/[0.05] bg-white p-5 shadow-apple shadow-apple-hover flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <Link
                    href={`/dashboard/forms/${form.id}/builder`}
                    className="font-bold text-[#1D1D1F] hover:text-[#007AFF] transition-colors text-base tracking-tight"
                  >
                    {form.name}
                  </Link>
                  <StatusBadge status={form.status} startAt={form.startAt} endAt={form.endAt} />
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-[#86868B] font-mono bg-black/[0.03] px-2.5 py-0.5 rounded-full">
                    /f/{form.slug}
                  </span>
                  {form.status === 'published' && <CopyLinkButton slug={form.slug} />}
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                <Link
                  href={`/dashboard/submissions?formId=${form.id}`}
                  className="rounded-full bg-black/[0.03] hover:bg-black/[0.06] px-3 py-1.5 text-xs font-medium text-[#1D1D1F] transition-colors"
                >
                  {form.submissionCount} {form.submissionCount === 1 ? 'submission' : 'submissions'}
                </Link>

                {form.status === 'published' && (
                  <ShareDialog formTitle={form.name} slug={form.slug} />
                )}

                <Link
                  href={`/dashboard/forms/${form.id}/builder`}
                  className="rounded-full bg-[#007AFF]/10 hover:bg-[#0071E3] hover:text-white text-[#007AFF] px-4 py-1.5 text-xs font-semibold transition-all"
                >
                  Edit in Studio &rarr;
                </Link>

                <DeleteFormDialog
                  formId={form.id}
                  formName={form.name}
                  submissionCount={form.submissionCount}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Starter Templates Shelf */}
      <div className="mt-8 pt-8 border-t border-black/[0.06]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#86868B]">Quick Starter Templates</h2>
            <p className="text-xs text-[#86868B] mt-0.5">Click any template to instantly pre-configure a new form</p>
          </div>
          <Link
            href="/dashboard/forms/new"
            className="text-xs font-medium text-[#007AFF] hover:underline"
          >
            Browse all 12 templates &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <form action={createForm} className="rounded-3xl bg-white p-5 border border-black/[0.05] shadow-apple shadow-apple-hover flex flex-col justify-between">
            <input type="hidden" name="templateId" value="scholarship-application" />
            <div>
              <div className="h-9 w-9 rounded-2xl bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center text-lg mb-3">
                🎓
              </div>
              <p className="text-sm font-semibold text-[#1D1D1F]">Scholarship &amp; Aid</p>
              <p className="text-xs text-[#86868B] mt-1 leading-relaxed">
                Includes applicant details, GPA, College Year, conditional aid rules, and ID document upload.
              </p>
            </div>
            <Button type="submit" variant="secondary" size="sm" className="mt-4 w-full text-xs">
              Use Template &rarr;
            </Button>
          </form>

          <form action={createForm} className="rounded-3xl bg-white p-5 border border-black/[0.05] shadow-apple shadow-apple-hover flex flex-col justify-between">
            <input type="hidden" name="templateId" value="job-application" />
            <div>
              <div className="h-9 w-9 rounded-2xl bg-[#34C759]/10 text-[#34C759] flex items-center justify-center text-lg mb-3">
                💼
              </div>
              <p className="text-sm font-semibold text-[#1D1D1F]">Job Application</p>
              <p className="text-xs text-[#86868B] mt-1 leading-relaxed">
                Pre-configured for role selection, professional experience, portfolio link, and CV upload.
              </p>
            </div>
            <Button type="submit" variant="secondary" size="sm" className="mt-4 w-full text-xs">
              Use Template &rarr;
            </Button>
          </form>

          <form action={createForm} className="rounded-3xl bg-white p-5 border border-black/[0.05] shadow-apple shadow-apple-hover flex flex-col justify-between">
            <input type="hidden" name="templateId" value="contact-form" />
            <div>
              <div className="h-9 w-9 rounded-2xl bg-[#FF9500]/10 text-[#FF9500] flex items-center justify-center text-lg mb-3">
                ✉️
              </div>
              <p className="text-sm font-semibold text-[#1D1D1F]">Contact Form</p>
              <p className="text-xs text-[#86868B] mt-1 leading-relaxed">
                Collect user inquiries, support requests, contact email, and detailed message notes.
              </p>
            </div>
            <Button type="submit" variant="secondary" size="sm" className="mt-4 w-full text-xs">
              Use Template &rarr;
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({
  status,
  startAt,
  endAt,
}: {
  status: string;
  startAt?: Date | null;
  endAt?: Date | null;
}) {
  const now = new Date();

  // If published, check if the application window has ended or hasn't started yet
  if (status === 'published') {
    // 1. Time limit period has ended
    if (endAt && now > new Date(endAt)) {
      return (
        <span
          title={`Submission window ended on ${new Date(endAt).toLocaleString()}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-500/20"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Ended
        </span>
      );
    }

    // 2. Not yet open (scheduled for future date)
    if (startAt && now < new Date(startAt)) {
      return (
        <span
          title={`Scheduled to open on ${new Date(startAt).toLocaleString()}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-500/20"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          Scheduled
        </span>
      );
    }

    // 3. Actively published and accepting submissions
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#34C759]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#34C759] border border-[#34C759]/20">
        <span className="h-1.5 w-1.5 rounded-full bg-[#34C759]" />
        Published
      </span>
    );
  }

  // Draft or other statuses
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.04] px-2.5 py-0.5 text-[11px] font-medium text-[#86868B] border border-black/[0.05] capitalize">
      <span className="h-1.5 w-1.5 rounded-full bg-[#86868B]" />
      {status}
    </span>
  );
}

