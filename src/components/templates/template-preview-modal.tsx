'use client';

import React, { useEffect } from 'react';
import type { FormTemplate } from '@/lib/templates';
import type { FormField } from '@/db/schema';
import { FieldRenderer } from '@/components/forms/field-renderer';
import { getFieldWidthClass } from '@/lib/field-types';
import { X, Sparkles, GitBranch, ArrowRight, Loader2 } from 'lucide-react';

interface TemplatePreviewModalProps {
  template: FormTemplate;
  onClose: () => void;
  onUseTemplate: (templateId: string) => void;
  isCreating?: boolean;
}

function getConditionDescription(field: FormField, allFields: FormField[]): string {
  if (!field.visibleIf) return '';
  const { conditions, fieldId, equals, value } = field.visibleIf;

  const firstCondition =
    conditions?.[0] ?? (fieldId ? { fieldId, operator: 'equals', value: value ?? equals } : null);
  if (!firstCondition) return 'Conditional';

  const triggerField = allFields.find((f) => f.id === firstCondition.fieldId);
  const triggerLabel = triggerField ? triggerField.label : 'another field';
  const targetVal = String(firstCondition.value ?? '');

  switch (firstCondition.operator) {
    case 'equals':
      return `Shown when "${triggerLabel}" is "${targetVal}"`;
    case 'not_equals':
      return `Shown when "${triggerLabel}" is not "${targetVal}"`;
    case 'contains':
      return `Shown when "${triggerLabel}" contains "${targetVal}"`;
    case 'is_not_empty':
      return `Shown when "${triggerLabel}" is filled`;
    case 'is_empty':
      return `Shown when "${triggerLabel}" is empty`;
    default:
      return `Shown when "${triggerLabel}" matches condition`;
  }
}

export function TemplatePreviewModal({
  template,
  onClose,
  onUseTemplate,
  isCreating = false,
}: TemplatePreviewModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-2xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 flex flex-col w-full max-w-3xl max-h-[92vh] sm:max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-black/[0.08] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 border-b border-black/[0.08] bg-[#FBFBFC]">
          <div className="flex items-start gap-3 min-w-0">
            <span className="text-2xl select-none shrink-0 mt-0.5">{template.icon}</span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-[#1D1D1F] truncate">
                  {template.name}
                </h3>
                <span className="text-[11px] font-medium text-[#86868B] bg-black/[0.04] px-2 py-0.5 rounded-full">
                  {template.category}
                </span>
                <span className="text-[11px] font-medium text-[#007AFF] bg-[#007AFF]/10 px-2 py-0.5 rounded-full">
                  {template.fields.length} fields
                </span>
              </div>
              <p className="text-xs text-[#86868B] mt-0.5 line-clamp-2 sm:truncate">
                {template.description}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onUseTemplate(template.id)}
              disabled={isCreating}
              className="flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-[#007AFF] text-xs font-semibold text-white shadow-xs hover:bg-[#0071E3] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <span>Use template</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
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

        {/* Info banner */}
        <div className="px-4 sm:px-6 py-2 bg-[#F5F5F7] border-b border-black/[0.06] flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[#86868B] gap-1">
          <span>
            Read-only preview. All fields, layouts, and conditional logic will be fully editable in FormFlow Studio.
          </span>
          <span className="font-medium text-[#1D1D1F] shrink-0">12-column grid ready</span>
        </div>

        {/* Form Body Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#F5F5F7]/60">
          <div className="mx-auto max-w-xl bg-white rounded-2xl border border-black/[0.08] p-5 sm:p-6 shadow-xs">
            <div className="grid grid-cols-12 gap-x-4 gap-y-4 pointer-events-none">
              {template.fields.map((field) => {
                const widthClass = getFieldWidthClass(field.width);
                const isConditional = Boolean(
                  field.visibleIf &&
                    ((field.visibleIf.conditions && field.visibleIf.conditions.length > 0) ||
                      field.visibleIf.fieldId),
                );

                const conditionDesc = isConditional
                  ? getConditionDescription(field, template.fields)
                  : '';

                const conditionalBadge = isConditional ? (
                  <span
                    title={conditionDesc}
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200/80"
                  >
                    <GitBranch className="h-2.5 w-2.5 text-indigo-600 shrink-0" />
                    <span className="truncate max-w-[220px]">
                      {conditionDesc || 'Conditional'}
                    </span>
                  </span>
                ) : null;

                return (
                  <div key={field.id} className={widthClass}>
                    <FieldRenderer
                      field={field}
                      value={undefined}
                      onChange={() => {}}
                      disabled
                      labelExtra={conditionalBadge}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 sm:px-6 border-t border-black/[0.08] bg-[#FBFBFC]">
          <span className="text-xs text-[#86868B] text-center sm:text-left">
            Creates a brand-new form with unique IDs and remapped rules.
          </span>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none h-8 px-3.5 rounded-lg border border-black/[0.1] bg-white text-xs font-medium text-[#1D1D1F] hover:bg-black/[0.03] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onUseTemplate(template.id)}
              disabled={isCreating}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 h-8 px-4 rounded-lg bg-[#007AFF] text-xs font-semibold text-white shadow-xs hover:bg-[#0071E3] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Creating form...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Create form from template</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

