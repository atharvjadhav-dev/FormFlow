'use client';

import { useState, useTransition } from 'react';
import { updateSubmissionStatus } from '@/app/dashboard/submissions/actions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { Check, ShieldCheck } from 'lucide-react';

const STATUSES = [
  { value: 'pending', label: 'Pending Review' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
] as const;

export function StatusForm({
  submissionId,
  currentStatus,
  currentNotes,
}: {
  submissionId: string;
  currentStatus: string;
  currentNotes: string;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [notes, setNotes] = useState(currentNotes);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSave() {
    startTransition(async () => {
      await updateSubmissionStatus(
        submissionId,
        status as 'pending' | 'under_review' | 'approved' | 'rejected',
        notes || undefined,
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  return (
    <div className="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-apple">
      <div className="flex items-center gap-2 mb-1">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#007AFF]/10 text-[#007AFF]">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-bold text-[#1D1D1F]">Review &amp; Decision</h3>
      </div>
      <p className="text-xs text-[#86868B] mb-4">
        Change the submission status and keep internal notes for auditing.
      </p>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-[#1D1D1F] block mb-1">Change Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-10 w-full rounded-xl border border-black/[0.08] bg-[#F5F5F7]/80 px-3 text-xs font-medium text-[#1D1D1F] focus:border-[#007AFF] focus:outline-none"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-[#1D1D1F] block mb-1">Reviewer Notes (Optional)</label>
          <Textarea
            placeholder="Add internal notes, verification comments, or next steps..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="rounded-2xl bg-[#F5F5F7]/80 text-xs border-black/[0.08] min-h-[90px]"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          {saved ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
              <Check className="h-3.5 w-3.5" /> Changes saved
            </span>
          ) : (
            <span />
          )}

          <Button
            onClick={handleSave}
            disabled={isPending}
            size="sm"
            className="rounded-full bg-[#007AFF] text-white hover:bg-[#0071E3] font-medium text-xs px-5 shadow-apple-hover"
          >
            Save Decision
          </Button>
        </div>
      </div>
    </div>
  );
}

