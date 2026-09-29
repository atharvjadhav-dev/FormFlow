'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { FormField } from '@/db/schema';
import { FieldRenderer } from '@/components/forms/field-renderer';
import { getFieldMeta, getFieldWidthClass, getFieldWidthFraction } from '@/lib/field-types';
import { ContextualToolbar } from './contextual-toolbar';
import { cn } from '@/lib/utils';
import { GripVertical, Trash2, Copy, GitBranch } from 'lucide-react';

export function SortableField({
  field,
  selected,
  onSelect,
  onRemove,
  onDuplicate,
  onUpdate,
  onOpenProperties,
  isQuickAddOpen = false,
}: {
  field: FormField;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onDuplicate?: () => void;
  onUpdate?: (patch: Partial<FormField>) => void;
  onOpenProperties?: () => void;
  isQuickAddOpen?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });
  const fieldRef = useRef<HTMLDivElement | null>(null);

  const setCombinedRef = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node);
      fieldRef.current = node;
    },
    [setNodeRef],
  );

  useEffect(() => {
    if (selected && fieldRef.current) {
      const active = document.activeElement;
      if (!active?.closest('[data-properties-panel]')) {
        fieldRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        fieldRef.current.focus({ preventScroll: true });
      }
    }
  }, [selected]);

  // Use CSS.Translate to prevent squashing/stretching of different width columns during 2D drag
  const style = { transform: CSS.Translate.toString(transform), transition };
  const meta = getFieldMeta(field.type);
  const widthClass = getFieldWidthClass(field.width);
  const isFullWidth = !field.width || field.width === 12;

  const hasConditions = Boolean(
    field.visibleIf &&
    ((field.visibleIf.conditions && field.visibleIf.conditions.length > 0) || field.visibleIf.fieldId)
  );

  const conditionalBadge = hasConditions ? (
    <span
      title="This field has conditional visibility"
      aria-label="This field has conditional visibility"
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200/80 cursor-help pointer-events-auto transition-colors hover:bg-indigo-100"
    >
      <GitBranch className="h-2.5 w-2.5 text-indigo-600" />
      <span>Conditional</span>
    </span>
  ) : null;

  return (
    <div
      ref={setCombinedRef}
      data-field-id={field.id}
      tabIndex={-1}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={cn(
        'group relative rounded-xl px-3.5 py-3 transition-all duration-150 cursor-pointer focus:outline-none',
        widthClass,
        selected
          ? 'ring-1 ring-[#007AFF] bg-[#007AFF]/[0.02]'
          : 'hover:bg-black/[0.02] hover:ring-1 hover:ring-black/[0.06]',
        isDragging && 'opacity-40 ring-1 ring-[#007AFF] bg-[#007AFF]/[0.04]',
      )}
    >
      {/* Floating Contextual Toolbar when selected */}
      {selected && !isDragging && !isQuickAddOpen && (
        <ContextualToolbar
          field={field}
          onUpdateWidth={(width) => onUpdate?.({ width })}
          onDuplicate={() => onDuplicate?.()}
          onDelete={onRemove}
          onOpenProperties={() => onOpenProperties?.()}
          dragHandleProps={{ ...attributes, ...listeners }}
          fieldElement={fieldRef.current}
        />
      )}

      {/* Left gutter drag grip for full-width fields (when not selected) */}
      {isFullWidth && !selected && (
        <div className="absolute -left-7 top-3.5 flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <button
            type="button"
            aria-label="Drag to reorder"
            className="cursor-grab p-1 text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/[0.05] rounded active:cursor-grabbing"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Subtle hover actions (when not selected) */}
      {!selected && (
        <div className="absolute right-2.5 top-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10 bg-white/95 backdrop-blur-xs shadow-xs border border-black/[0.08] rounded-lg px-1.5 py-0.5">
          <button
            type="button"
            aria-label="Drag to reorder"
            className="cursor-grab p-1 text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/[0.05] rounded active:cursor-grabbing"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#86868B] bg-black/[0.04] px-1.5 py-0.5 rounded">
            {getFieldWidthFraction(field.width)}
          </span>
          {onDuplicate && (
            <button
              type="button"
              aria-label="Duplicate field (Ctrl+D)"
              title="Duplicate (Ctrl+D)"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              className="p-1 rounded text-[#86868B] hover:text-[#007AFF] hover:bg-[#007AFF]/10 transition-colors"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            aria-label="Remove field (Delete)"
            title="Delete field"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="p-1 rounded text-[#86868B] hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Field Content - renders directly as form input */}
      <div className="pointer-events-none pr-28">
        <FieldRenderer field={field} value={undefined} onChange={() => {}} disabled labelExtra={conditionalBadge} />
      </div>
    </div>
  );
}



