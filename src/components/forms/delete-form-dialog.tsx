'use client';

import React, { useState, useEffect, useTransition, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2, X } from 'lucide-react';
import { deleteForm } from '@/app/dashboard/forms/actions';

interface DeleteFormDialogProps {
  formId: string;
  formName: string;
  submissionCount?: number;
}

const emptySubscribe = () => () => {};

export function DeleteFormDialog({
  formId,
  formName,
  submissionCount = 0,
}: DeleteFormDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  // Close on Escape key
  useEffect(() => {
    if (!isOpen || isPending) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isPending]);

  // Lock background scroll when open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      try {
        await deleteForm(formId);
        setIsOpen(false);
        router.refresh();
      } catch (err: unknown) {
        console.error('[delete-form] Failed to delete form:', err);
        setError(err instanceof Error ? err.message : 'Failed to delete form');
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(true);
        }}
        title="Delete form"
        aria-label={`Delete ${formName}`}
        className="rounded-full bg-black/[0.03] hover:bg-red-50 hover:text-red-600 text-[#86868B] px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 border border-transparent hover:border-red-200"
      >
        <Trash2 className="h-3.5 w-3.5 text-current" />
        <span>Delete</span>
      </button>

      {isOpen &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-in fade-in duration-150"
            onClick={(e) => {
              e.stopPropagation();
              if (!isPending) setIsOpen(false);
            }}
            role="dialog"
            aria-modal="true"
            aria-label={`Delete ${formName}`}
          >
            <div
              className="relative w-full max-w-sm rounded-2xl border border-black/[0.08] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              disabled={isPending}
              className="absolute right-4 top-4 p-1.5 text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/[0.05] rounded-lg transition-colors"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mx-auto h-12 w-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-4 border border-red-100">
              <Trash2 className="h-5 w-5 stroke-2" />
            </div>

            <h3 className="text-center text-base font-bold text-[#1D1D1F]">
              Delete form?
            </h3>

            <p className="mt-2 text-center text-xs text-[#86868B] leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-[#1D1D1F]">&ldquo;{formName}&rdquo;</span>?
              {submissionCount > 0 ? (
                <> All <strong className="text-[#1D1D1F]">{submissionCount} submission{submissionCount > 1 ? 's' : ''}</strong> and form history will be permanently deleted.</>
              ) : (
                <> This action cannot be undone and will permanently remove this form.</>
              )}
            </p>

            {error && (
              <div className="mt-3 rounded-xl bg-red-50 p-2.5 text-xs text-red-600 border border-red-200 text-center">
                {error}
              </div>
            )}

            <div className="mt-6 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="flex-1 h-9 rounded-xl border border-black/[0.08] bg-white text-xs font-semibold text-[#1D1D1F] hover:bg-black/[0.03] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="flex-1 h-9 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-semibold text-white shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete form</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
