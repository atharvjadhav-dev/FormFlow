'use client';

import { useState } from 'react';
import type { FormField, FieldCondition, ConditionOperator } from '@/db/schema';
import {
  eligibleDependencies,
  getSupportedOperators,
  formatConditionText,
} from '@/lib/form-schema';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Eye, EyeOff, AlertTriangle } from 'lucide-react';

interface ConditionalLogicEditorProps {
  field: FormField;
  allFields: FormField[];
  onChange: (patch: Partial<FormField>) => void;
}

export function ConditionalLogicEditor({
  field,
  allFields,
  onChange,
}: ConditionalLogicEditorProps) {
  const [showLogicSummary, setShowLogicSummary] = useState(false);

  const dependencies = eligibleDependencies(allFields, field.id);
  const isEnabled = Boolean(field.visibleIf);

  // Normalize current conditions
  const conditions: FieldCondition[] =
    field.visibleIf?.conditions && field.visibleIf.conditions.length > 0
      ? field.visibleIf.conditions
      : field.visibleIf?.fieldId
      ? [
          {
            fieldId: field.visibleIf.fieldId,
            operator: field.visibleIf.operator ?? 'equals',
            value: field.visibleIf.value ?? field.visibleIf.equals,
          },
        ]
      : [];

  const combinator = field.visibleIf?.combinator ?? 'and';

  function handleToggle(enabled: boolean) {
    if (enabled) {
      if (dependencies.length > 0) {
        const defaultSource = dependencies[0];
        const defaultOp = getSupportedOperators(defaultSource.type)[0].value;
        const defaultValue = defaultSource.options?.[0] ?? '';
        onChange({
          visibleIf: {
            conditions: [
              {
                fieldId: defaultSource.id,
                operator: defaultOp,
                value: defaultValue,
              },
            ],
            combinator: 'and',
          },
        });
      } else {
        onChange({
          visibleIf: {
            conditions: [],
            combinator: 'and',
          },
        });
      }
    } else {
      onChange({ visibleIf: undefined });
    }
  }

  function handleAddCondition() {
    if (dependencies.length === 0) return;
    const defaultSource = dependencies[0];
    const defaultOp = getSupportedOperators(defaultSource.type)[0].value;
    const defaultValue = defaultSource.options?.[0] ?? '';
    const newConditions = [
      ...conditions,
      {
        fieldId: defaultSource.id,
        operator: defaultOp,
        value: defaultValue,
      },
    ];
    onChange({
      visibleIf: {
        conditions: newConditions,
        combinator,
      },
    });
  }

  function handleRemoveCondition(index: number) {
    const newConditions = conditions.filter((_, idx) => idx !== index);
    onChange({
      visibleIf: {
        conditions: newConditions,
        combinator,
      },
    });
  }

  function handleUpdateCondition(index: number, patch: Partial<FieldCondition>) {
    const updated = conditions.map((cond, idx) => {
      if (idx !== index) return cond;
      const merged = { ...cond, ...patch };

      // If source field changed, adjust operator and value to fit new field type
      if (patch.fieldId && patch.fieldId !== cond.fieldId) {
        const newSource = dependencies.find((d) => d.id === patch.fieldId);
        if (newSource) {
          const supportedOps = getSupportedOperators(newSource.type);
          merged.operator = supportedOps[0].value;
          merged.value = newSource.options?.[0] ?? '';
        }
      }

      // If operator became empty check, clear value
      if (patch.operator === 'is_empty' || patch.operator === 'is_not_empty') {
        merged.value = '';
      }

      return merged;
    });

    onChange({
      visibleIf: {
        conditions: updated,
        combinator,
      },
    });
  }

  function handleToggleCombinator() {
    onChange({
      visibleIf: {
        conditions,
        combinator: combinator === 'and' ? 'or' : 'and',
      },
    });
  }

  return (
    <div id="conditional-logic-section" className="space-y-3 pt-3 border-t border-black/[0.06] text-sm">
      {/* Section Header with ON / OFF Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#86868B]">
            Conditional Logic
          </p>
          <p className="text-xs text-[#86868B]">Show this field based on rules</p>
        </div>

        {/* Compact Segmented Switch */}
        <div className="inline-flex h-7 items-center rounded-lg bg-black/[0.04] p-0.5 border border-black/[0.06]">
          <button
            type="button"
            onClick={() => handleToggle(false)}
            className={cn(
              'px-2 py-0.5 text-xs font-medium rounded-md transition-all',
              !isEnabled
                ? 'bg-white text-[#1D1D1F] shadow-xs'
                : 'text-[#86868B] hover:text-[#1D1D1F]',
            )}
          >
            OFF
          </button>
          <button
            type="button"
            onClick={() => handleToggle(true)}
            className={cn(
              'px-2 py-0.5 text-xs font-medium rounded-md transition-all',
              isEnabled
                ? 'bg-[#007AFF] text-white shadow-xs'
                : 'text-[#86868B] hover:text-[#1D1D1F]',
            )}
          >
            ON
          </button>
        </div>
      </div>

      {!isEnabled ? (
        <p className="text-xs text-[#86868B] bg-black/[0.02] p-2.5 rounded-lg border border-black/[0.04]">
          This field is always visible on the published form. Toggle ON to define display rules.
        </p>
      ) : dependencies.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900 space-y-1">
          <p className="font-semibold flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            No earlier fields available
          </p>
          <p className="text-amber-800/90 leading-relaxed">
            Fields can only depend on fields positioned above them in the form. Move this field down or add fields above it.
          </p>
        </div>
      ) : (
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[#1D1D1F]">Show this field when:</span>
            {conditions.length > 0 && (
              <button
                type="button"
                onClick={() => setShowLogicSummary(!showLogicSummary)}
                className="text-[11px] text-[#007AFF] hover:underline flex items-center gap-1"
              >
                {showLogicSummary ? (
                  <>
                    <EyeOff className="h-3 w-3" /> Hide summary
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3" /> View logic
                  </>
                )}
              </button>
            )}
          </div>

          {/* Logic Summary Preview Card */}
          {showLogicSummary && conditions.length > 0 && (
            <div className="rounded-xl border border-[#007AFF]/20 bg-[#007AFF]/[0.03] p-3 text-xs space-y-1.5 animate-in fade-in duration-100">
              <p className="font-semibold text-[#007AFF] text-[11px] uppercase tracking-wider">
                Logic Rule Summary
              </p>
              <div className="space-y-1 font-mono text-[11px] text-[#1D1D1F]">
                {conditions.map((cond, idx) => (
                  <div key={idx} className="space-y-1">
                    {idx > 0 && (
                      <span className="inline-block px-1.5 py-0.5 rounded bg-black/[0.06] text-[10px] font-bold text-[#007AFF]">
                        {combinator.toUpperCase()}
                      </span>
                    )}
                    <p className="bg-white/80 px-2 py-1 rounded border border-black/[0.04]">
                      {formatConditionText(cond, allFields)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conditions List */}
          <div className="space-y-3">
            {conditions.map((cond, index) => {
              const sourceField = dependencies.find((d) => d.id === cond.fieldId);
              const isInvalidRef = !sourceField;
              const supportedOps = sourceField
                ? getSupportedOperators(sourceField.type)
                : [{ value: 'equals' as ConditionOperator, label: 'equals' }];

              return (
                <div key={index} className="space-y-2">
                  {/* Combinator separator between condition 1 and condition 2+ */}
                  {index > 0 && (
                    <div className="flex items-center justify-center py-1">
                      <button
                        type="button"
                        onClick={handleToggleCombinator}
                        title="Click to toggle AND / OR"
                        className="rounded-full border border-black/[0.1] bg-white px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-[#007AFF] hover:bg-[#007AFF]/10 shadow-xs transition-colors"
                      >
                        {combinator.toUpperCase()}
                      </button>
                    </div>
                  )}

                  {/* Condition Box */}
                  <div className="rounded-xl border border-black/[0.08] bg-white p-3 shadow-xs space-y-2.5">
                    {isInvalidRef && (
                      <div className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 px-2 py-1 rounded-md border border-rose-100">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span>Referenced field was moved or deleted.</span>
                      </div>
                    )}

                    {/* Row 1: Source Field Selector & Delete Button */}
                    <div className="flex items-center gap-2">
                      <select
                        aria-label="Source field"
                        value={cond.fieldId}
                        onChange={(e) => handleUpdateCondition(index, { fieldId: e.target.value })}
                        className="h-8 flex-1 rounded-lg border border-black/[0.1] bg-white px-2.5 text-xs text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                      >
                        {isInvalidRef && (
                          <option value={cond.fieldId} disabled>
                            (Deleted / Missing Field)
                          </option>
                        )}
                        {dependencies.map((dep) => (
                          <option key={dep.id} value={dep.id}>
                            {dep.label} ({dep.type})
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        aria-label="Remove condition"
                        title="Delete condition"
                        onClick={() => handleRemoveCondition(index)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[#86868B] hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Row 2: Operator Selector */}
                    <div>
                      <select
                        aria-label="Condition operator"
                        value={cond.operator}
                        onChange={(e) =>
                          handleUpdateCondition(index, {
                            operator: e.target.value as ConditionOperator,
                          })
                        }
                        className="h-8 w-full rounded-lg border border-black/[0.1] bg-white px-2.5 text-xs text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                      >
                        {supportedOps.map((op) => (
                          <option key={op.value} value={op.value}>
                            {op.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Row 3: Adapted Value Input (hidden for is_empty/is_not_empty) */}
                    {cond.operator !== 'is_empty' && cond.operator !== 'is_not_empty' && (
                      <div>
                        {sourceField && (sourceField.type === 'dropdown' || sourceField.type === 'radio') && sourceField.options && sourceField.options.length > 0 ? (
                          <select
                            aria-label="Condition value"
                            value={String(cond.value ?? '')}
                            onChange={(e) => handleUpdateCondition(index, { value: e.target.value })}
                            className="h-8 w-full rounded-lg border border-black/[0.1] bg-white px-2.5 text-xs text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                          >
                            <option value="">Select option...</option>
                            {sourceField.options.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : sourceField && sourceField.type === 'checkbox' && (!sourceField.options || sourceField.options.length === 0) ? (
                          <select
                            aria-label="Condition value"
                            value={String(cond.value ?? 'true')}
                            onChange={(e) =>
                              handleUpdateCondition(index, { value: e.target.value === 'true' })
                            }
                            className="h-8 w-full rounded-lg border border-black/[0.1] bg-white px-2.5 text-xs text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]"
                          >
                            <option value="true">Checked</option>
                            <option value="false">Unchecked</option>
                          </select>
                        ) : sourceField && sourceField.type === 'number' ? (
                          <Input
                            type="number"
                            aria-label="Condition numeric value"
                            placeholder="Enter number..."
                            value={String(cond.value ?? '')}
                            onChange={(e) =>
                              handleUpdateCondition(index, {
                                value: e.target.value === '' ? '' : Number(e.target.value),
                              })
                            }
                            className="h-8 rounded-lg bg-white text-xs border-black/[0.1]"
                          />
                        ) : sourceField && sourceField.type === 'date' ? (
                          <Input
                            type="date"
                            aria-label="Condition date value"
                            value={String(cond.value ?? '')}
                            onChange={(e) => handleUpdateCondition(index, { value: e.target.value })}
                            className="h-8 rounded-lg bg-white text-xs border-black/[0.1]"
                          />
                        ) : (
                          <Input
                            type="text"
                            aria-label="Condition text value"
                            placeholder="Enter matching text..."
                            value={String(cond.value ?? '')}
                            onChange={(e) => handleUpdateCondition(index, { value: e.target.value })}
                            className="h-8 rounded-lg bg-white text-xs border-black/[0.1]"
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Condition Action Button */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleAddCondition}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#007AFF] hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> Add condition
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
