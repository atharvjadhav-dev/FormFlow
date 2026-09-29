import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { withOrg } from '@/db/client';
import { submissions, forms, formVersions, submissionFiles, type FormSchema } from '@/db/schema';
import { createPresignedDownloadUrl } from '@/lib/s3';
import { StatusPill } from '@/components/dashboard/submissions-table';
import { StatusForm } from './status-form';
import { requireOrgAuth } from '@/lib/auth';
import { ChevronLeft, FileText, Download, Calendar, Mail, UserCheck } from 'lucide-react';

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
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">
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
      <div className="rounded-3xl border border-black/[0.06] bg-white p-6 sm:p-8 shadow-apple">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center rounded-full bg-[#F5F5F7] px-2.5 py-0.5 text-[11px] font-semibold text-[#86868B]">
              {form.name}
            </span>
            <h1 className="text-xl font-bold tracking-tight text-[#1D1D1F] mt-2">
              {submission.submitterEmail ?? 'Anonymous Applicant'}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-[#86868B]">
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

          <StatusPill status={submission.status} />
        </div>
      </div>

      {/* Submission Responses Section */}
      <div className="rounded-3xl border border-black/[0.06] bg-white p-6 sm:p-8 shadow-apple space-y-5">
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
                      <div className="flex items-center justify-between rounded-2xl border border-black/[0.08] bg-[#F5F5F7]/70 p-3 max-w-md">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#007AFF] shadow-sm">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-[#1D1D1F] line-clamp-1">{file.fileName}</p>
                            <p className="text-[10px] text-[#86868B]">
                              {Math.round(file.sizeBytes / 1024)} KB
                            </p>
                          </div>
                        </div>

                        {downloadUrls[file.id] ? (
                          <a
                            href={downloadUrls[file.id]}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-[#007AFF] shadow-sm border border-black/[0.06] hover:bg-[#F5F5F7] transition-all"
                          >
                            <Download className="h-3 w-3" />
                            Download
                          </a>
                        ) : (
                          <span className="text-[11px] text-[#86868B]">Stored</span>
                        )}
                      </div>
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

