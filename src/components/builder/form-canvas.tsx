'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import type { FormField, FieldType } from '@/db/schema';
import { SortableField } from './sortable-field';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export const CANVAS_DROPPABLE_ID = 'canvas-droppable';

export function FormCanvas({
  formTitle,
  fields,
  selectedFieldId,
  isDraggingActive,
  onSelect,
  onRemove,
  onDuplicate,
  onAdd,
  onUpdate,
  onOpenProperties,
  isQuickAddOpen,
}: {
  formTitle?: string;
  fields: FormField[];
  selectedFieldId: string | null;
  isDraggingActive?: boolean;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onAdd?: (type: FieldType) => void;
  onUpdate?: (id: string, patch: Partial<FormField>) => void;
  onOpenProperties?: () => void;
  isQuickAddOpen?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: CANVAS_DROPPABLE_ID });
  const showGuides = Boolean(isDraggingActive || isOver);

  return (
    <div
      id={CANVAS_DROPPABLE_ID}
      data-canvas
      ref={setNodeRef}
      className={cn(
        'relative mx-auto min-h-[500px] max-w-xl rounded-2xl border border-black/[0.08] bg-white px-8 sm:px-10 py-8 shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all duration-150',
        isOver && 'ring-2 ring-[#007AFF] ring-offset-2',
      )}
    >
      {/* Temporary Column Guides (Visible ONLY while actively dragging/reordering, never permanent) */}
      {showGuides && (
        <div className="pointer-events-none absolute inset-x-8 sm:inset-x-10 top-20 bottom-8 grid grid-cols-12 gap-x-4 opacity-20 z-0">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-full rounded bg-[#007AFF]/15 border border-dashed border-[#007AFF]/30" />
          ))}
        </div>
      )}

      {/* Form Title Banner */}
      {formTitle && (
        <div className="relative z-10 mb-6 pb-3 border-b border-black/[0.06]">
          <h2 className="text-xl font-semibold text-[#1D1D1F] tracking-tight">{formTitle}</h2>
        </div>
      )}

      {fields.length === 0 ? (
        <div className="relative z-10 flex min-h-[340px] flex-col items-center justify-center py-12 text-center select-none">
          <p className="text-base font-semibold text-[#1D1D1F]">Empty Form Canvas</p>
          <p className="mt-1 max-w-xs text-sm text-[#86868B]">
            Click a component from the left sidebar or drag it here to add your first field.
          </p>
          <p className="mt-2 text-xs text-[#86868B]">
            Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-black/[0.05] font-mono text-[11px] text-[#1D1D1F] border border-black/[0.08] shadow-2xs">/</kbd> to Quick Add
          </p>

          {onAdd && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => onAdd('text')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.1] bg-white px-3 py-1.5 text-xs font-medium text-[#1D1D1F] hover:bg-black/[0.03] hover:border-black/[0.2] transition-all"
              >
                <Plus className="h-3.5 w-3.5 text-[#007AFF]" /> Name
              </button>
              <button
                type="button"
                onClick={() => onAdd('email')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.1] bg-white px-3 py-1.5 text-xs font-medium text-[#1D1D1F] hover:bg-black/[0.03] hover:border-black/[0.2] transition-all"
              >
                <Plus className="h-3.5 w-3.5 text-[#007AFF]" /> Email
              </button>
              <button
                type="button"
                onClick={() => onAdd('phone')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.1] bg-white px-3 py-1.5 text-xs font-medium text-[#1D1D1F] hover:bg-black/[0.03] hover:border-black/[0.2] transition-all"
              >
                <Plus className="h-3.5 w-3.5 text-[#007AFF]" /> Phone
              </button>
            </div>
          )}
        </div>
      ) : (
        <SortableContext items={fields.map((f) => f.id)} strategy={rectSortingStrategy}>
          <div className="relative z-10 grid grid-cols-12 gap-x-4 gap-y-4">
            {fields.map((field) => (
              <SortableField
                key={field.id}
                field={field}
                selected={field.id === selectedFieldId}
                onSelect={() => onSelect(field.id)}
                onRemove={() => onRemove(field.id)}
                onDuplicate={() => onDuplicate?.(field.id)}
                onUpdate={(patch) => onUpdate?.(field.id, patch)}
                onOpenProperties={onOpenProperties}
                isQuickAddOpen={isQuickAddOpen}
              />
            ))}
          </div>
        </SortableContext>
      )}
    </div>
  );
}



