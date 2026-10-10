import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { withOrg } from '@/db/client';
import { submissions, forms, formVersions, submissionFiles, type FormSchema } from '@/db/schema';
import { createPresignedDownloadUrl } from '@/lib/s3';
import { StatusPill } from '@/components/dashboard/submissions-table';
import { StatusForm } from './status-form';
import { FileAttachmentCard } from './file-attachment-card';
import { requireOrgAuth } from '@/lib/auth';
import { ChevronLeft, Calendar } from 'lucide-react';

export default async function SubmissionDetailPage({ params }: { params: Promise<{ submissionId: string }> }) {
  const { submissionId } = await params;
  const { orgId } = await requireOrgAuth();

  const data = await withOrg(orgId, async (tx) => {
    const [submission] = await tx.select().from(submissions).where(eq(submissions.id, submissionId)).limit(1);
    if (!submission) return null;

    const [form] = await tx.select().from(forms).where(eq(forms.id, submission.formId)).limit(1);
    const [version] = await tx.select().from(formVersions).where(eq(formVersions.id, submission.formVersionId)).limit(1);
    const files = await tx.select().from(submissionFiles).where(eq(submissionFiles.submissionId, submissionId));

    return { submission, form, version, files };
  });

  if (!data || !data.form || !data.version) notFound();
  const { submission, form, version, files } = data;
  const schema = version.schema as FormSchema;
  const answers = submission.answers as Record<string, unknown>;

  const filesByField = new Map(files.map((f) => [f.fieldId, f]));
  const downloadUrls: Record<string, string> = {};
  for (const f of files) {
    try {
      downloadUrls[f.id] = await createPresignedDownloadUrl(f.s3Key);
    } catch {
      // Fallback or local file path handling
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-6 sm:py-10 space-y-5 sm:space-y-6">
      {/* Back to Submissions Pill */}
      <div>
        <Link
          href="/dashboard/submissions"
          className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-medium text-[#1D1D1F] shadow-sm border border-black/[0.08] hover:bg-[#F5F5F7] active:scale-95 transition-all"
        >
          <ChevronLeft className="h-3.5 w-3.5 text-[#86868B]" />
          All Submissions
        </Link>
      </div>

      {/* Submission Header Card */}
      <div className="rounded-2xl sm:rounded-3xl border border-black/[0.06] bg-white p-4 sm:p-8 shadow-apple">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="inline-flex items-center rounded-full bg-[#F5F5F7] px-2.5 py-0.5 text-[11px] font-semibold text-[#86868B] truncate max-w-full">
              {form.name}
            </span>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[#1D1D1F] mt-2 truncate">
              {submission.submitterEmail ?? 'Anonymous Applicant'}
            </h1>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 text-xs text-[#86868B]">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(submission.submittedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
              <span>•</span>
              <span className="font-mono text-[11px]">ID: {submission.id.slice(0, 8)}</span>
            </div>
          </div>

          <div className="self-start sm:self-auto">
            <StatusPill status={submission.status} />
          </div>
        </div>
      </div>

      {/* Submission Responses Section */}
      <div className="rounded-2xl sm:rounded-3xl border border-black/[0.06] bg-white p-4 sm:p-8 shadow-apple space-y-5">
        <div className="border-b border-black/[0.06] pb-4">
          <h2 className="text-base font-bold text-[#1D1D1F]">Application Responses</h2>
          <p className="text-xs text-[#86868B] mt-0.5">Submitted answers to form fields.</p>
        </div>

        <div className="divide-y divide-black/[0.04] space-y-4">
          {schema.fields
            .filter((f) => f.type !== 'heading' && f.type !== 'paragraph' && f.type !== 'divider')
            .map((field) => {
              if (field.type === 'file' || field.type === 'image') {
                const file = filesByField.get(field.id);
                return (
                  <div key={field.id} className="pt-4 first:pt-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#86868B] mb-2">
                      {field.label}
                    </p>
                    {file ? (
                      <FileAttachmentCard
                        fileName={file.fileName}
                        sizeBytes={file.sizeBytes}
                        mimeType={file.mimeType}
                        url={downloadUrls[file.id]}
                        fieldLabel={field.label}
                      />
                    ) : (
                      <p className="text-xs text-[#86868B] italic">No file attached</p>
                    )}
                  </div>
                );
              }

              const value = answers[field.id];
              return (
                <div key={field.id} className="pt-4 first:pt-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#86868B] mb-1">
                    {field.label}
                  </p>
                  <p className="text-sm font-medium text-[#1D1D1F]">
                    {Array.isArray(value)
                      ? value.join(', ')
                      : value != null && value !== ''
                      ? String(value)
                      : <span className="text-[#86868B] italic">Not provided</span>}
                  </p>
                </div>
              );
            })}
        </div>
      </div>

      {/* Review & Status Decision */}
      <StatusForm
        submissionId={submission.id}
        currentStatus={submission.status}
        currentNotes={submission.reviewNotes ?? ''}
      />
    </div>
  );
}

