'use client';

import React from 'react';
import type { FormVersionItem } from '@/app/dashboard/forms/[formId]/actions';
import { FieldRenderer } from '@/components/forms/field-renderer';
import { X, RotateCcw, Calendar, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';

interface VersionPreviewModalProps {
  version: FormVersionItem;
  formName: string;
  onClose: () => void;
  onRestore: (version: FormVersionItem) => void;
  isRestoring?: boolean;
}

export function VersionPreviewModal({
  version,
  formName,
  onClose,
  onRestore,
  isRestoring = false,
}: VersionPreviewModalProps) {
  const fields = version.schema?.fields ?? [];
  const formattedDate = new Date(version.createdAt).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-2xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 flex flex-col w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-black/[0.08] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.08] bg-[#FBFBFC]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <Clock className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-[#1D1D1F] truncate">
                  Version {version.versionNumber} Preview
                </h3>
                {version.status === 'published' ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="h-3 w-3" /> Published
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-[#86868B] bg-black/[0.04] px-2 py-0.5 rounded-full">
                    Draft
                  </span>
                )}
                {version.isSafetySnapshot && (
                  <span className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded-full">
                    Safety Backup
                  </span>
                )}
              </div>
              <p className="text-xs text-[#86868B] flex items-center gap-1.5 mt-0.5">
                <Calendar className="h-3 w-3" />
                <span>Saved on {formattedDate}</span>
                <span>•</span>
                <span>{fields.length} {fields.length === 1 ? 'field' : 'fields'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!version.isCurrentDraft && (
              <button
                type="button"
                disabled={isRestoring}
                onClick={() => onRestore(version)}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#007AFF] text-xs font-semibold text-white shadow-xs hover:bg-[#0071E3] transition-colors disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Restore version</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/[0.05] transition-colors"
              aria-label="Close preview"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Read-only banner */}
        <div className="px-6 py-2 bg-amber-50/70 border-b border-amber-200/50 flex items-center gap-2 text-xs text-amber-800">
          <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-amber-600" />
          <span>
            Read-only preview. Inspecting this version does not change your working draft or public form.
          </span>
        </div>

        {/* Body Canvas Preview */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#F5F5F7]">
          <div className="mx-auto max-w-xl bg-white rounded-2xl border border-black/[0.08] p-6 shadow-xs space-y-4">
            <div className="pb-3 border-b border-black/[0.06]">
              <h2 className="text-lg font-bold text-[#1D1D1F]">{formName}</h2>
              <p className="text-xs text-[#86868B] mt-0.5">Version {version.versionNumber} snapshot</p>
            </div>

            {fields.length === 0 ? (
              <div className="py-12 text-center text-sm text-[#86868B]">
                This version has no fields.
              </div>
            ) : (
              <div className="space-y-4 pointer-events-none">
                {fields.map((field) => (
                  <div key={field.id} className="relative rounded-xl border border-black/[0.04] p-3 bg-white/70">
                    <FieldRenderer field={field} value={undefined} onChange={() => {}} disabled />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-black/[0.08] bg-[#FBFBFC]">
          <span className="text-xs text-[#86868B]">
            {version.isCurrentDraft ? 'This is your current draft' : 'Ready to restore if you want to recover this state'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-3.5 rounded-lg border border-black/[0.1] bg-white text-xs font-medium text-[#1D1D1F] hover:bg-black/[0.03] transition-colors"
          >
            Close preview
          </button>
        </div>
      </div>
    </div>
  );
}
