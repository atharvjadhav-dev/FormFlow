'use client';

import type { FormField, FieldWidth } from '@/db/schema';
import { getFieldMeta, getFieldWidthFraction } from '@/lib/field-types';
import { eligibleDependencies } from '@/lib/form-schema';
import { Input, Label } from '@/components/ui/input';
import { Plus, X } from 'lucide-react';
import { ConditionalLogicEditor } from './conditional-logic-editor';

export function PropertiesPanel({
  field,
  allFields,
  onChange,
}: {
  field: FormField | null;
  allFields: FormField[];
  onChange: (patch: Partial<FormField>) => void;
}) {
  if (!field) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center select-none">
        <p className="text-sm text-[#86868B]">Select a field to edit its properties</p>
      </div>
    );
  }

  const meta = getFieldMeta(field.type);
  const dependencies = eligibleDependencies(allFields, field.id);

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-4 select-none text-sm">
      {/* Header with Type Tag & Width Tag */}
      <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
        <span className="text-sm font-semibold text-[#1D1D1F]">Field Properties</span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono font-medium text-[#007AFF] bg-[#007AFF]/10 px-2 py-0.5 rounded">
            {getFieldWidthFraction(field.width)}
          </span>
          <span className="text-xs font-mono uppercase tracking-wider text-[#86868B] bg-black/[0.04] px-2 py-0.5 rounded">
            {meta.label}
          </span>
        </div>
      </div>

      {/* SECTION: LAYOUT */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#86868B]">Layout</p>
        <div className="space-y-1.5">
          <label htmlFor="field-width" className="text-sm font-medium text-[#1D1D1F]">
            Width
          </label>
          <select
            id="field-width"
            name="fieldWidth"
            value={field.width ?? 12}
            onChange={(e) => onChange({ width: Number(e.target.value) as FieldWidth })}
            className="h-9 w-full rounded-lg border border-black/[0.1] bg-white px-3 text-sm text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
          >
            <option value={12}>Full width</option>
            <option value={6}>Half</option>
            <option value={4}>One third</option>
            <option value={8}>Two thirds</option>
            <option value={3}>Quarter</option>
            <option value={9}>Three quarters</option>
          </select>
        </div>
      </div>

      {/* SECTION: GENERAL */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#86868B]">General</p>

        <div className="space-y-1.5">
          <label htmlFor="field-label" className="text-sm font-medium text-[#1D1D1F]">
            {meta.isLayoutOnly ? 'Display Text' : 'Label'}
          </label>
          <Input
            id="field-label"
            value={field.label}
            onChange={(e) => onChange({ label: e.target.value })}
            className="h-9 rounded-lg bg-white text-sm border-black/[0.1]"
          />
        </div>

        {!meta.isLayoutOnly && (
          <>
            <div className="space-y-1.5">
              <label htmlFor="field-placeholder" className="text-sm font-medium text-[#1D1D1F]">
                Placeholder
              </label>
              <Input
                id="field-placeholder"
                value={field.placeholder ?? ''}
                onChange={(e) => onChange({ placeholder: e.target.value })}
                placeholder="e.g. Enter value..."
                className="h-9 rounded-lg bg-white text-sm border-black/[0.1]"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-medium text-[#1D1D1F]">Required</span>
              <label htmlFor="field-required-toggle" className="relative inline-flex items-center cursor-pointer">
                <input
                  id="field-required-toggle"
                  name="fieldRequired"
                  type="checkbox"
                  checked={field.required ?? false}
                  onChange={(e) => onChange({ required: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[#E5E5EA] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#007AFF]" />
              </label>
            </div>
          </>
        )}
      </div>

      {/* SECTION: VALIDATION (Only when applicable) */}
      {(field.type === 'text' || field.type === 'textarea' || meta.isFileType) && (
        <div className="space-y-3 pt-3 border-t border-black/[0.06]">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#86868B]">Validation</p>

          {(field.type === 'text' || field.type === 'textarea') && (
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label htmlFor="min-length" className="text-xs font-medium text-[#86868B]">
                  Min Length
                </label>
                <Input
                  id="min-length"
                  type="number"
                  value={field.validation?.minLength ?? ''}
                  onChange={(e) =>
                    onChange({
                      validation: {
                        ...field.validation,
                        minLength: e.target.value ? Number(e.target.value) : undefined,
                      },
                    })
                  }
                  className="h-9 rounded-lg bg-white text-sm border-black/[0.1]"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="max-length" className="text-xs font-medium text-[#86868B]">
                  Max Length
                </label>
                <Input
                  id="max-length"
                  type="number"
                  value={field.validation?.maxLength ?? ''}
                  onChange={(e) =>
                    onChange({
                      validation: {
                        ...field.validation,
                        maxLength: e.target.value ? Number(e.target.value) : undefined,
                      },
                    })
                  }
                  className="h-9 rounded-lg bg-white text-sm border-black/[0.1]"
                />
              </div>
            </div>
          )}

          {meta.isFileType && (
            <div className="space-y-2.5">
              <div className="space-y-1">
                <label htmlFor="max-size" className="text-xs font-medium text-[#86868B]">
                  Max Size (MB)
                </label>
                <Input
                  id="max-size"
                  type="number"
                  value={field.file?.maxSizeMb ?? 10}
                  onChange={(e) =>
                    onChange({ file: { ...field.file!, maxSizeMb: Number(e.target.value) || 1 } })
                  }
                  className="h-9 rounded-lg bg-white text-sm border-black/[0.1]"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="mime-types" className="text-xs font-medium text-[#86868B]">
                  Accepted MIME Types
                </label>
                <Input
                  id="mime-types"
                  value={field.file?.acceptedMimeTypes.join(', ') ?? ''}
                  placeholder="application/pdf, image/png"
                  onChange={(e) =>
                    onChange({
                      file: {
                        ...field.file!,
                        acceptedMimeTypes: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                      },
                    })
                  }
                  className="h-9 rounded-lg bg-white text-sm border-black/[0.1]"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION: OPTIONS (Only when relevant) */}
      {meta.hasOptions && (
        <div className="space-y-3 pt-3 border-t border-black/[0.06]">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#86868B]">Options</p>
          <div className="space-y-2">
            {(field.options ?? []).map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={opt}
                  onChange={(e) => {
                    const options = [...(field.options ?? [])];
                    options[i] = e.target.value;
                    onChange({ options });
                  }}
                  className="h-9 rounded-lg bg-white text-sm border-black/[0.1]"
                />
                <button
                  type="button"
                  aria-label="Remove option"
                  onClick={() => onChange({ options: (field.options ?? []).filter((_, idx) => idx !== i) })}
                  className="p-1.5 rounded-md text-[#86868B] hover:text-rose-500 hover:bg-rose-50 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              onChange({ options: [...(field.options ?? []), `Option ${(field.options?.length ?? 0) + 1}`] })
            }
            className="flex items-center gap-1.5 text-xs font-medium text-[#007AFF] hover:underline pt-0.5"
          >
            <Plus className="h-3.5 w-3.5" /> Add option
          </button>
        </div>
      )}

      {/* SECTION: CONDITIONAL LOGIC */}
      {!meta.isLayoutOnly && (
        <ConditionalLogicEditor
          field={field}
          allFields={allFields}
          onChange={onChange}
        />
      )}
    </div>
  );
}



