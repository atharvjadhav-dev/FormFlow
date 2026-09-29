'use client';

import { useMemo, useRef, useState } from 'react';
import type { FormSchema } from '@/db/schema';
import { visibleFields } from '@/lib/form-schema';
import { FieldRenderer } from '@/components/forms/field-renderer';
import { Button } from '@/components/ui/button';
import { getFieldWidthClass } from '@/lib/field-types';
import { cn } from '@/lib/utils';

interface PublicFormClientProps {
  slug: string;
  formName: string;
  orgName: string;
  formVersionId: string;
  schema: FormSchema;
}

type UploadState = {
  status: 'idle' | 'uploading' | 'done' | 'error';
  s3Key?: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  error?: string;
};

export function PublicFormClient({ slug, formName, orgName, formVersionId, schema }: PublicFormClientProps) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [uploads, setUploads] = useState<Record<string, UploadState>>({});
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Stable for the lifetime of this form-fill session, so a retried request
  // (flaky connection, double-click) can never create a duplicate submission.
  const idempotencyKey = useRef(crypto.randomUUID()).current;

  const fields = useMemo(() => visibleFields(schema.fields, answers), [schema.fields, answers]);

  async function handleFileChange(fieldId: string, file: File | null) {
    if (!file) return;
    setUploads((prev) => ({ ...prev, [fieldId]: { status: 'uploading' } }));

    try {
      const presignRes = await fetch(`/api/forms/${slug}/presign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldId, fileName: file.name, mimeType: file.type || 'application/octet-stream', sizeBytes: file.size }),
      });
      if (!presignRes.ok) {
        const errJson = await presignRes.json().catch(() => null);
        const errText = errJson?.message ?? (await presignRes.text().catch(() => 'Upload initialization failed'));
        throw new Error(errText);
      }
      const { uploadUrl, s3Key } = await presignRes.json();

      const putRes = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file });
      if (!putRes.ok) {
        console.error('[Upload] PUT failed with status:', putRes.status);
        throw new Error('Upload to storage failed. Please try again.');
      }

      setUploads((prev) => ({
        ...prev,
        [fieldId]: { status: 'done', s3Key, fileName: file.name, mimeType: file.type, sizeBytes: file.size },
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      console.error('[Upload error]:', err);
      setUploads((prev) => ({ ...prev, [fieldId]: { status: 'error', error: msg } }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitState('submitting');
    setErrorMessage(null);

    const hasFailedUploads = Object.values(uploads).some((u) => u.status === 'error');
    if (hasFailedUploads) {
      setErrorMessage('One or more files failed to upload. Please re-select and upload them before submitting.');
      setSubmitState('error');
      return;
    }

    const files = Object.entries(uploads)
      .filter(([, u]) => u.status === 'done' && u.s3Key)
      .map(([fieldId, u]) => ({
        fieldId,
        s3Key: u.s3Key!,
        fileName: u.fileName!,
        mimeType: u.mimeType!,
        sizeBytes: u.sizeBytes!,
      }));

    try {
      const res = await fetch(`/api/forms/${slug}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formVersionId, idempotencyKey, answers, files }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErrorMessage(body.message ?? 'Something went wrong. Please try again.');
        setSubmitState('error');
        return;
      }
      setSubmitState('done');
    } catch {
      setErrorMessage('Network error — you can safely try submitting again.');
      setSubmitState('error');
    }
  }

  const totalFields = fields.filter((f) => f.type !== 'heading' && f.type !== 'paragraph' && f.type !== 'divider').length;
  const answeredCount = fields.filter((f) => {
    if (f.type === 'heading' || f.type === 'paragraph' || f.type === 'divider') return false;
    if (f.type === 'file' || f.type === 'image') return uploads[f.id]?.status === 'done';
    const ans = answers[f.id];
    return ans !== undefined && ans !== null && ans !== '' && (!Array.isArray(ans) || ans.length > 0);
  }).length;
  const progressPct = totalFields > 0 ? Math.round((answeredCount / totalFields) * 100) : 0;

  if (submitState === 'done') {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 sm:p-10 shadow-apple-lg border border-black/[0.04] text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-[#34C759]/10 text-[#34C759] flex items-center justify-center mb-5 animate-bounce">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1D1D1F]">Submission Received</h1>
          <p className="mt-2 text-sm text-[#86868B] leading-relaxed">
            Thank you! Your application for <span className="font-semibold text-[#1D1D1F]">{formName}</span> has been securely recorded.
          </p>
          <div className="mt-6 p-4 rounded-2xl bg-[#F5F5F7] border border-black/[0.04] text-xs text-[#86868B]">
            You will hear back directly from <span className="font-semibold text-[#1D1D1F]">{orgName || 'the organizer'}</span>.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] py-10 sm:py-16 px-4 sm:px-6 flex flex-col justify-center items-center">
      <div className="w-full max-w-xl rounded-3xl bg-white p-6 sm:p-10 shadow-apple-lg border border-black/[0.04]">
        {/* Top Organization Badge & Dynamic Progress */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-black/[0.04] px-3 py-1 text-xs font-semibold text-[#1D1D1F]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#007AFF]" />
            {orgName || 'FormFlow'}
          </span>
          <span className="text-xs font-semibold text-[#86868B] tabular-nums">
            {answeredCount} of {totalFields} answered
          </span>
        </div>

        {/* Apple Blue Progress Bar */}
        <div className="w-full h-1.5 bg-black/[0.04] rounded-full overflow-hidden mb-8">
          <div
            className="h-full bg-[#007AFF] rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1D1D1F] mb-8">
          {formName}
        </h1>

        <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-x-4 gap-y-5">
          {fields.map((field) =>
            field.type === 'file' || field.type === 'image' ? (
              <div key={field.id} className={cn(getFieldWidthClass(field.width), 'space-y-1.5')}>
                <FieldRenderer
                  field={field}
                  value={undefined}
                  onChange={(v) => handleFileChange(field.id, v as File | null)}
                />
                <UploadStatus state={uploads[field.id]} />
              </div>
            ) : (
              <div key={field.id} className={getFieldWidthClass(field.width)}>
                <FieldRenderer
                  field={field}
                  value={answers[field.id]}
                  onChange={(v) => setAnswers((prev) => ({ ...prev, [field.id]: v }))}
                />
              </div>
            ),
          )}

          {errorMessage && (
            <div className="col-span-12 rounded-2xl bg-[#FF3B30]/10 border border-[#FF3B30]/20 p-3 text-xs font-medium text-[#FF3B30] flex items-center gap-2">
              <span>⚠</span> {errorMessage}
            </div>
          )}

          <div className="col-span-12">
            <Button
              type="submit"
              size="lg"
              className="w-full rounded-full bg-[#007AFF] hover:bg-[#0071E3] text-white font-semibold shadow-sm hover:shadow active:scale-[0.98] transition-all text-sm py-3.5 mt-2"
              disabled={submitState === 'submitting' || hasPendingUploads(uploads)}
            >
              {submitState === 'submitting' ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Submitting Application...
                </span>
              ) : (
                'Submit Application'
              )}
            </Button>
          </div>

          <div className="col-span-12 text-center pt-2">
            <p className="text-[11px] text-[#86868B] flex items-center justify-center gap-1.5">
              <svg className="h-3.5 w-3.5 text-[#34C759]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Encrypted &amp; Secure · Powered by FormFlow
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

function hasPendingUploads(uploads: Record<string, UploadState>) {
  return Object.values(uploads).some((u) => u.status === 'uploading');
}

function UploadStatus({ state }: { state?: UploadState }) {
  if (!state || state.status === 'idle') return null;
  if (state.status === 'uploading') {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-xl bg-black/[0.03] p-2 text-xs text-[#86868B] animate-pulse">
        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[#007AFF] border-t-transparent" />
        Uploading document...
      </div>
    );
  }
  if (state.status === 'error') {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-xl bg-[#FF3B30]/10 border border-[#FF3B30]/20 p-2 text-xs font-medium text-[#FF3B30]">
        <span>⚠</span> {state.error ?? 'Upload failed — please select the file again.'}
      </div>
    );
  }
  return (
    <div className="mt-2 flex items-center justify-between rounded-xl bg-[#34C759]/10 border border-[#34C759]/20 p-2.5 text-xs font-medium text-[#34C759]">
      <div className="flex items-center gap-2">
        <span>✓</span>
        <span className="truncate max-w-[200px]">{state.fileName}</span>
      </div>
      <span className="text-[11px] opacity-80">{Math.round((state.sizeBytes ?? 0) / 1024)} KB</span>
    </div>
  );
}
