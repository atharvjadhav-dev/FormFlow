'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  listFormVersions,
  restoreVersion,
  type FormVersionItem,
} from '@/app/dashboard/forms/[formId]/actions';
import type { FormField, FormSchema } from '@/db/schema';
import { VersionPreviewModal } from './version-preview-modal';
import {
  Clock,
  X,
  RotateCcw,
  Eye,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Calendar,
  Layers,
} from 'lucide-react';

interface VersionHistoryPanelProps {
  formId: string;
  formName: string;
  currentFields: FormField[];
  isOpen: boolean;
  onClose: () => void;
  onRestoreSuccess: (fields: FormField[], versionNumber: number) => void;
}

export function VersionHistoryPanel({
  formId,
  formName,
  currentFields,
  isOpen,
  onClose,
  onRestoreSuccess,
}: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<FormVersionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [previewVersion, setPreviewVersion] = useState<FormVersionItem | null>(null);
  const [versionToRestore, setVersionToRestore] = useState<FormVersionItem | null>(null);
  const [isRestoring, startRestoreTransition] = useTransition();

  const fetchVersions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listFormVersions(formId);
      setVersions(data);
    } catch {
      setError('Could not load version history.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchVersions();
    }
  }, [isOpen, formId]);

  if (!isOpen) return null;

  // Group versions by Date: "Today", "Yesterday", "Earlier"
  const now = new Date();
  const todayStr = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  const grouped: Record<string, FormVersionItem[]> = {};

  versions.forEach((v) => {
    const vDate = new Date(v.createdAt);
    const dateStr = vDate.toDateString();
    let groupLabel = 'Earlier';
    if (dateStr === todayStr) {
      groupLabel = 'Today';
    } else if (dateStr === yesterdayStr) {
      groupLabel = 'Yesterday';
    } else {
      groupLabel = vDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }

    if (!grouped[groupLabel]) {
      grouped[groupLabel] = [];
    }
    grouped[groupLabel].push(v);
  });

  const handleConfirmRestore = () => {
    if (!versionToRestore) return;
    const target = versionToRestore;

    startRestoreTransition(async () => {
      try {
        const result = await restoreVersion(formId, target.id, { fields: currentFields });
        onRestoreSuccess(result.restoredSchema.fields, target.versionNumber);
        setVersionToRestore(null);
        setPreviewVersion(null);
        await fetchVersions();
      } catch (err) {
        setError('Failed to restore version. Please try again.');
      }
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-2xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <aside
        className="fixed inset-y-0 right-0 z-50 flex flex-col w-full sm:w-[420px] bg-white shadow-2xl border-l border-black/[0.08] animate-in slide-in-from-right duration-200"
        aria-label="Version history panel"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.08] bg-[#FBFBFC]">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-[#007AFF]/10 flex items-center justify-center text-[#007AFF]">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#1D1D1F]">Version history</h2>
              <p className="text-[11px] text-[#86868B]">Inspect and restore previous saves</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/[0.05] transition-colors"
            aria-label="Close version history"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16 text-center text-[#86868B] space-y-2">
              <Loader2 className="h-6 w-6 animate-spin text-[#007AFF]" />
              <p className="text-xs font-medium">Loading history...</p>
            </div>
          )}

          {error && !isLoading && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-center space-y-2">
              <AlertCircle className="h-5 w-5 text-rose-600 mx-auto" />
              <p className="text-xs font-medium text-rose-800">{error}</p>
              <button
                type="button"
                onClick={fetchVersions}
                className="h-7 px-3 rounded-md bg-white border border-rose-300 text-xs font-medium text-rose-700 hover:bg-rose-50 shadow-2xs"
              >
                Try again
              </button>
            </div>
          )}

          {!isLoading && !error && versions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center text-[#86868B] space-y-2">
              <Clock className="h-8 w-8 stroke-1 text-[#86868B]/60" />
              <p className="text-sm font-semibold text-[#1D1D1F]">No previous versions yet</p>
              <p className="text-xs max-w-xs text-[#86868B]">
                Each time you save substantial changes to your form, a recoverable version will be created here.
              </p>
            </div>
          )}

          {!isLoading &&
            !error &&
            Object.entries(grouped).map(([dateLabel, items]) => (
              <div key={dateLabel} className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B]">
                    {dateLabel}
                  </span>
                  <div className="h-px flex-1 bg-black/[0.06]" />
                </div>

                <div className="space-y-2">
                  {items.map((v) => {
                    const timeFormatted = new Date(v.createdAt).toLocaleTimeString(undefined, {
                      hour: 'numeric',
                      minute: '2-digit',
                    });

                    return (
                      <div
                        key={v.id}
                        className={`group relative rounded-xl border p-3 transition-all ${
                          v.isCurrentDraft
                            ? 'border-[#007AFF]/40 bg-[#007AFF]/[0.02] shadow-2xs'
                            : 'border-black/[0.06] bg-white hover:border-black/[0.14] hover:shadow-2xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5 min-w-0">
                            {/* Version indicator dot */}
                            <div className="mt-1 flex items-center justify-center shrink-0">
                              {v.isCurrentDraft ? (
                                <span className="h-2.5 w-2.5 rounded-full bg-[#007AFF] ring-4 ring-[#007AFF]/15" />
                              ) : (
                                <span className="h-2.5 w-2.5 rounded-full border-2 border-[#86868B]/50" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-semibold text-[#1D1D1F]">
                                  {v.isCurrentDraft ? 'Current draft' : `Version ${v.versionNumber}`}
                                </span>

                                {v.status === 'published' && (
                                  <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200/70">
                                    <CheckCircle2 className="h-2.5 w-2.5" /> Published
                                  </span>
                                )}
                                {!v.isCurrentDraft && v.status === 'draft' && (
                                  <span className="rounded-full bg-black/[0.04] px-1.5 py-0.5 text-[10px] font-medium text-[#86868B]">
                                    Draft
                                  </span>
                                )}
                                {v.isSafetySnapshot && (
                                  <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-200/60">
                                    Backup
                                  </span>
                                )}
                              </div>

                              <p className="text-[11px] text-[#86868B] mt-0.5">
                                Saved {timeFormatted} • {v.fieldCount} {v.fieldCount === 1 ? 'field' : 'fields'}
                                {v.conditionalCount > 0 && ` • ${v.conditionalCount} rules`}
                              </p>

                              {v.description && (
                                <p className="text-[11px] text-[#1D1D1F]/80 italic mt-1 font-mono">
                                  &ldquo;{v.description}&rdquo;
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => setPreviewVersion(v)}
                              title="Preview this version"
                              className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-black/[0.08] bg-white text-[11px] font-medium text-[#1D1D1F] hover:bg-black/[0.04] transition-colors"
                            >
                              <Eye className="h-3 w-3 text-[#86868B]" />
                              <span>Preview</span>
                            </button>

                            {!v.isCurrentDraft && (
                              <button
                                type="button"
                                onClick={() => setVersionToRestore(v)}
                                title="Restore this version"
                                className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-[#007AFF]/20 bg-[#007AFF]/5 text-[11px] font-medium text-[#007AFF] hover:bg-[#007AFF]/10 transition-colors"
                              >
                                <RotateCcw className="h-3 w-3" />
                                <span>Restore</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 border-t border-black/[0.08] bg-[#FBFBFC] text-[11px] text-[#86868B] flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>Restoring saves a safety snapshot first</span>
          </div>
          <span>Showing up to 50 versions</span>
        </div>
      </aside>

      {/* Read-only Preview Modal */}
      {previewVersion && (
        <VersionPreviewModal
          version={previewVersion}
          formName={formName}
          onClose={() => setPreviewVersion(null)}
          onRestore={(v) => {
            setVersionToRestore(v);
          }}
          isRestoring={isRestoring}
        />
      )}

      {/* Restore Confirmation Dialog */}
      {versionToRestore && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-2xs"
            onClick={() => !isRestoring && setVersionToRestore(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-black/[0.08] space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 shrink-0">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-[#1D1D1F]">
                  Restore Version {versionToRestore.versionNumber}?
                </h3>
                <p className="text-xs text-[#86868B] leading-relaxed">
                  Your current draft will be replaced by this version.
                </p>
                <p className="text-xs text-[#86868B] leading-relaxed">
                  FormFlow will automatically create a safety snapshot of your current draft first so you can return to it at any time.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-black/[0.06] bg-[#F5F5F7] p-3 text-xs space-y-1">
              <div className="flex justify-between text-[#86868B]">
                <span>Version to restore:</span>
                <span className="font-semibold text-[#1D1D1F]">Version {versionToRestore.versionNumber}</span>
              </div>
              <div className="flex justify-between text-[#86868B]">
                <span>Fields in restored version:</span>
                <span className="font-semibold text-[#1D1D1F]">{versionToRestore.fieldCount} fields</span>
              </div>
              <div className="flex justify-between text-[#86868B]">
                <span>Public live form:</span>
                <span className="font-medium text-emerald-700">Remains unchanged until Publish</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isRestoring}
                onClick={() => setVersionToRestore(null)}
                className="h-8 px-3.5 rounded-lg border border-black/[0.1] bg-white text-xs font-medium text-[#1D1D1F] hover:bg-black/[0.03] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRestoring}
                onClick={handleConfirmRestore}
                className="flex h-8 items-center gap-1.5 px-4 rounded-lg bg-[#007AFF] text-xs font-semibold text-white shadow-xs hover:bg-[#0071E3] transition-colors disabled:opacity-50"
              >
                {isRestoring ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Restoring version...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Restore version</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
