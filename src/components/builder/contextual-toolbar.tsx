'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { FormField, FieldWidth } from '@/db/schema';
import { cn } from '@/lib/utils';
import {
  GripVertical,
  ChevronDown,
  Check,
  Copy,
  Trash2,
  SlidersHorizontal,
  MoreHorizontal,
} from 'lucide-react';

interface ContextualToolbarProps {
  field: FormField;
  onUpdateWidth: (width: FieldWidth) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onOpenProperties: () => void;
  dragHandleProps?: Record<string, any>;
  fieldElement?: HTMLElement | null;
}

const WIDTH_OPTIONS: { value: FieldWidth; display: string }[] = [
  { value: 12, display: 'Full' },
  { value: 6, display: 'Half' },
  { value: 4, display: '1/3' },
  { value: 8, display: '2/3' },
  { value: 3, display: '1/4' },
  { value: 9, display: '3/4' },
];

function getWidthDisplay(width?: FieldWidth): string {
  switch (width) {
    case 6:
      return '1/2';
    case 4:
      return '1/3';
    case 8:
      return '2/3';
    case 3:
      return '1/4';
    case 9:
      return '3/4';
    case 12:
    default:
      return 'Full';
  }
}

export function ContextualToolbar({
  field,
  onUpdateWidth,
  onDuplicate,
  onDelete,
  onOpenProperties,
  dragHandleProps,
  fieldElement,
}: ContextualToolbarProps) {
  const [placement, setPlacement] = useState<'top' | 'bottom'>('top');
  const [align, setAlign] = useState<'left' | 'right'>('left');
  const [isWidthOpen, setIsWidthOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const toolbarRef = useRef<HTMLDivElement>(null);
  const widthMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Position calculation: flip to bottom if insufficient space above
  const updatePlacement = useCallback(() => {
    if (!fieldElement) return;
    const rect = fieldElement.getBoundingClientRect();
    const toolbarHeight = 44;
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;

    if (spaceAbove < toolbarHeight + 16 && spaceBelow >= toolbarHeight + 16) {
      setPlacement('bottom');
    } else {
      setPlacement('top');
    }

    const toolbarWidth = 230;
    if (rect.left + toolbarWidth > window.innerWidth - 20) {
      setAlign('right');
    } else {
      setAlign('left');
    }
  }, [fieldElement]);

  useEffect(() => {
    updatePlacement();
    window.addEventListener('scroll', updatePlacement, true);
    window.addEventListener('resize', updatePlacement);
    return () => {
      window.removeEventListener('scroll', updatePlacement, true);
      window.removeEventListener('resize', updatePlacement);
    };
  }, [updatePlacement]);

  // Click outside to close submenus
  useEffect(() => {
    if (!isWidthOpen && !isMoreOpen) return;

    function handlePointerDown(e: PointerEvent) {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setIsWidthOpen(false);
        setIsMoreOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isWidthOpen, isMoreOpen]);

  // Close menus on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (isWidthOpen || isMoreOpen) {
          e.stopPropagation();
          setIsWidthOpen(false);
          setIsMoreOpen(false);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isWidthOpen, isMoreOpen]);

  const currentWidthDisplay = getWidthDisplay(field.width);

  return (
    <div
      ref={toolbarRef}
      data-contextual-toolbar
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'absolute z-30 flex h-8 items-center gap-0.5 rounded-lg border border-black/[0.08] bg-white px-1 shadow-[0_4px_16px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.04] text-xs select-none transition-all duration-100',
        placement === 'top' ? 'bottom-[calc(100%+6px)]' : 'top-[calc(100%+6px)]',
        align === 'right' ? 'right-0' : 'left-0',
      )}
    >
      {/* 1. Drag / Move Handle */}
      <button
        type="button"
        aria-label="Drag to move"
        title="Move"
        className="flex h-7 w-7 items-center justify-center rounded-md text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/[0.04] cursor-grab active:cursor-grabbing transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#007AFF]"
        {...dragHandleProps}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      {/* Divider */}
      <div className="h-4 w-px bg-black/[0.08] mx-0.5" />

      {/* 2. Layout Width Dropdown */}
      <div className="relative">
        <button
          type="button"
          aria-label="Change width"
          title="Change width"
          onClick={() => {
            setIsWidthOpen((prev) => !prev);
            setIsMoreOpen(false);
          }}
          className={cn(
            'flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-[#1D1D1F] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#007AFF]',
            'hover:bg-black/[0.04] active:bg-black/[0.08]',
            isWidthOpen && 'bg-black/[0.06] text-[#007AFF]',
          )}
        >
          <span>{currentWidthDisplay}</span>
          <ChevronDown
            className={cn('h-3 w-3 text-[#86868B] transition-transform', isWidthOpen && 'rotate-180 text-[#007AFF]')}
          />
        </button>

        {isWidthOpen && (
          <div
            ref={widthMenuRef}
            role="menu"
            aria-label="Width options"
            className={cn(
              'absolute z-40 w-32 rounded-xl border border-black/[0.08] bg-white p-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.04] text-xs animate-in fade-in zoom-in-95 duration-100',
              placement === 'top' ? 'bottom-full mb-2 left-0' : 'top-full mt-2 left-0',
            )}
          >
            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#86868B] border-b border-black/[0.06] mb-1">
              Width
            </div>
            {WIDTH_OPTIONS.map((opt) => {
              const isCurrent = (field.width ?? 12) === opt.value;
              return (
                <button
                  key={opt.value}
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    onUpdateWidth(opt.value);
                    setIsWidthOpen(false);
                  }}
                  className={cn(
                    'flex h-7 w-full items-center justify-between rounded-lg px-2 text-left transition-colors cursor-pointer focus:outline-none',
                    isCurrent
                      ? 'bg-[#007AFF]/10 text-[#007AFF] font-medium'
                      : 'text-[#1D1D1F] hover:bg-black/[0.04]',
                  )}
                >
                  <span>{opt.display}</span>
                  {isCurrent && <Check className="h-3.5 w-3.5 text-[#007AFF]" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="h-4 w-px bg-black/[0.08] mx-0.5 hidden sm:block" />

      {/* 3. Duplicate (Desktop) */}
      <button
        type="button"
        aria-label="Duplicate field"
        title="Duplicate (Ctrl+D)"
        onClick={onDuplicate}
        className="hidden sm:flex h-7 w-7 items-center justify-center rounded-md text-[#86868B] hover:text-[#007AFF] hover:bg-[#007AFF]/10 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#007AFF]"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>

      {/* 4. Delete (Desktop) */}
      <button
        type="button"
        aria-label="Delete field"
        title="Delete (Delete)"
        onClick={onDelete}
        className="hidden sm:flex h-7 w-7 items-center justify-center rounded-md text-[#86868B] hover:text-rose-600 hover:bg-rose-50 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-rose-500"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      {/* Divider */}
      <div className="h-4 w-px bg-black/[0.08] mx-0.5 hidden sm:block" />

      {/* 5. More / Properties (Desktop) */}
      <button
        type="button"
        aria-label="Edit properties"
        title="Edit properties"
        onClick={onOpenProperties}
        className="hidden sm:flex h-7 w-7 items-center justify-center rounded-md text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/[0.04] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#007AFF]"
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
      </button>

      {/* Divider (Mobile) */}
      <div className="h-4 w-px bg-black/[0.08] mx-0.5 sm:hidden" />

      {/* Mobile More Button & Dropdown */}
      <div className="relative sm:hidden">
        <button
          type="button"
          aria-label="More actions"
          title="More actions"
          onClick={() => {
            setIsMoreOpen((prev) => !prev);
            setIsWidthOpen(false);
          }}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-md text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/[0.04] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#007AFF]',
            isMoreOpen && 'bg-black/[0.06] text-[#007AFF]',
          )}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>

        {isMoreOpen && (
          <div
            ref={moreMenuRef}
            role="menu"
            aria-label="More field actions"
            className={cn(
              'absolute z-40 w-36 rounded-xl border border-black/[0.08] bg-white p-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.04] text-xs animate-in fade-in zoom-in-95 duration-100 right-0',
              placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
            )}
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onDuplicate();
                setIsMoreOpen(false);
              }}
              className="flex h-7 w-full items-center gap-2 rounded-lg px-2 text-left text-[#1D1D1F] hover:bg-black/[0.04] transition-colors"
            >
              <Copy className="h-3.5 w-3.5 text-[#86868B]" />
              <span>Duplicate</span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onOpenProperties();
                setIsMoreOpen(false);
              }}
              className="flex h-7 w-full items-center gap-2 rounded-lg px-2 text-left text-[#1D1D1F] hover:bg-black/[0.04] transition-colors"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-[#86868B]" />
              <span>Properties</span>
            </button>
            <div className="my-1 border-t border-black/[0.06]" />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onDelete();
                setIsMoreOpen(false);
              }}
              className="flex h-7 w-full items-center gap-2 rounded-lg px-2 text-left text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5 text-rose-500" />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
