'use client';

import { useDraggable } from '@dnd-kit/core';
import { FIELD_TYPES, type FieldTypeMeta } from '@/lib/field-types';
import { cn } from '@/lib/utils';
import {
  Type,
  Mail,
  Phone,
  Hash,
  Calendar,
  AlignLeft,
  ChevronDown,
  CheckCircle2,
  CheckSquare,
  UploadCloud,
  Image as ImageIcon,
  Heading,
  Pilcrow,
  Minus,
  Plus,
} from 'lucide-react';
import type { ComponentType } from 'react';

export const CATEGORIES: { label: string; types: FieldTypeMeta['type'][] }[] = [
  {
    label: 'INPUT',
    types: ['text', 'email', 'phone', 'number', 'date', 'textarea'],
  },
  {
    label: 'CHOICE',
    types: ['dropdown', 'radio', 'checkbox'],
  },
  {
    label: 'FILE',
    types: ['file', 'image'],
  },
  {
    label: 'LAYOUT',
    types: ['heading', 'paragraph', 'divider'],
  },
];

export const TYPE_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  text: Type,
  email: Mail,
  phone: Phone,
  number: Hash,
  date: Calendar,
  textarea: AlignLeft,
  dropdown: ChevronDown,
  radio: CheckCircle2,
  checkbox: CheckSquare,
  file: UploadCloud,
  image: ImageIcon,
  heading: Heading,
  paragraph: Pilcrow,
  divider: Minus,
};

export function FieldPalette({ onAdd }: { onAdd: (type: FieldTypeMeta['type']) => void }) {
  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-3.5 select-none text-sm">
      <div className="px-2 pt-1 pb-0.5">
        <p className="text-xs font-semibold text-[#1D1D1F] tracking-tight">Components</p>
        <p className="text-xs text-[#86868B]">Click or drag onto canvas</p>
      </div>

      {CATEGORIES.map((cat) => (
        <div key={cat.label} className="space-y-1">
          <p className="px-2 py-0.5 text-xs font-semibold tracking-wider text-[#86868B]">
            {cat.label}
          </p>
          <div className="space-y-0.5">
            {cat.types.map((type) => {
              const meta = FIELD_TYPES.find((f) => f.type === type);
              if (!meta) return null;
              return <PaletteItem key={type} meta={meta} onAdd={onAdd} />;
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function PaletteItem({ meta, onAdd }: { meta: FieldTypeMeta; onAdd: (type: FieldTypeMeta['type']) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${meta.type}`,
    data: { source: 'palette', fieldType: meta.type },
  });

  const Icon = TYPE_ICONS[meta.type] ?? Type;
  const displayLabel = meta.displayLabel ?? meta.label;

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => onAdd(meta.type)}
      className={cn(
        'group flex h-8 w-full items-center justify-between rounded-lg px-2.5 text-left text-sm font-normal text-[#1D1D1F] transition-colors',
        'hover:bg-black/[0.04] active:bg-black/[0.08]',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#007AFF]',
        isDragging && 'opacity-40 bg-[#007AFF]/10 text-[#007AFF]',
      )}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-center gap-2.5">
        <Icon className="h-4 w-4 text-[#86868B] group-hover:text-[#1D1D1F] transition-colors" />
        <span className="truncate">{displayLabel}</span>
      </div>
      <Plus className="h-3.5 w-3.5 text-[#86868B] opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}



