'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { bulkUpdateStatus } from '@/app/dashboard/submissions/actions';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Clock, Eye, XCircle } from 'lucide-react';

export interface SubmissionRow {
  id: string;
  formName: string;
  status: string;
  submitterEmail: string | null;
  submittedAt: string;
}

const STATUSES = ['pending', 'under_review', 'approved', 'rejected'] as const;

export function SubmissionsTable({ rows }: { rows: SubmissionRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id))));
  }

  function applyBulk(status: (typeof STATUSES)[number]) {
    startTransition(async () => {
      await bulkUpdateStatus([...selected], status);
      setSelected(new Set());
    });
  }

  return (
    <div className="space-y-3">
      {/* Bulk Action Capsule Bar */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-black/[0.08] bg-white p-3 shadow-apple backdrop-blur-md">
          <div className="flex items-center gap-2 px-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#007AFF] text-xs font-bold text-white">
              {selected.size}
            </span>
            <span className="text-xs font-semibold text-[#1D1D1F]">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                disabled={isPending}
                onClick={() => applyBulk(s)}
                className="rounded-full border border-black/[0.08] bg-[#F5F5F7] px-3 py-1.5 text-xs font-medium text-[#1D1D1F] hover:bg-[#E5E5EA] active:scale-95 transition-all"
              >
                Mark {s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Modern Table Container */}
      <div className="overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-apple">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F5F5F7]/80 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] border-b border-black/[0.06]">
            <tr>
              <th className="w-12 px-5 py-3.5">
                <input
                  type="checkbox"
                  checked={selected.size === rows.length && rows.length > 0}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded-md accent-[#007AFF] cursor-pointer"
                />
              </th>
              <th className="px-5 py-3.5">Form</th>
              <th className="px-5 py-3.5">Submitter Email</th>
              <th className="px-5 py-3.5">Submitted</th>
              <th className="px-5 py-3.5">Review Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.04]">
            {rows.map((row) => (
              <tr
                key={row.id}
                className="hover:bg-[#F5F5F7]/60 transition-colors group cursor-pointer"
                onClick={() => (window.location.href = `/dashboard/submissions/${row.id}`)}
              >
                <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected.has(row.id)}
                    onChange={() => toggle(row.id)}
                    className="h-4 w-4 rounded-md accent-[#007AFF] cursor-pointer"
                  />
                </td>
                <td className="px-5 py-3.5">
                  <span className="font-semibold text-[#1D1D1F] group-hover:text-[#007AFF] transition-colors">
                    {row.formName}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-[#1D1D1F]">
                  {row.submitterEmail ? (
                    <span className="font-medium">{row.submitterEmail}</span>
                  ) : (
                    <span className="text-[#86868B]">Anonymous</span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-[#86868B]">
                  {new Date(row.submittedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </td>
                <td className="px-5 py-3.5">
                  <StatusPill status={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const config: Record<string, { label: string; icon: typeof Clock; className: string }> = {
    pending: {
      label: 'Pending',
      icon: Clock,
      className: 'bg-[#F5F5F7] text-[#86868B] border border-black/[0.06]',
    },
    under_review: {
      label: 'Under Review',
      icon: Eye,
      className: 'bg-amber-50 text-amber-700 border border-amber-200/60',
    },
    approved: {
      label: 'Approved',
      icon: CheckCircle2,
      className: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
    },
    rejected: {
      label: 'Rejected',
      icon: XCircle,
      className: 'bg-rose-50 text-rose-700 border border-rose-200/60',
    },
  };

  const item = config[status] ?? config.pending;
  const Icon = item.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ${item.className}`}
    >
      <Icon className="h-3 w-3" />
      {item.label}
    </span>
  );
}

