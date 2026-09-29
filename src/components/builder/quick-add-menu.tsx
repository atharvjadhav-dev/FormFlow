'use client';

import { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import type { FormField, FieldType } from '@/db/schema';
import { FIELD_TYPES, type FieldTypeMeta } from '@/lib/field-types';
import { CATEGORIES, TYPE_ICONS } from './field-palette';
import { CANVAS_DROPPABLE_ID } from './form-canvas';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';

interface QuickAddMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: FieldType) => void;
  selectedFieldId: string | null;
  fields: FormField[];
}

const MENU_WIDTH = 280;
const ESTIMATED_MENU_HEIGHT = 340;
const VIEWPORT_PADDING = 12;

function scoreMatch(meta: FieldTypeMeta, cleanQuery: string): number {
  if (!cleanQuery) return 0;
  const label = (meta.displayLabel ?? meta.label).toLowerCase();
  const type = meta.type.toLowerCase();

  // Exact match on label or type
  if (label === cleanQuery || type === cleanQuery) return 100;
  // Prefix match on label or type
  if (label.startsWith(cleanQuery) || type.startsWith(cleanQuery)) return 80;
  // Keyword exact match
  if (meta.keywords?.some((k) => k.toLowerCase() === cleanQuery)) return 70;
  // Keyword prefix match
  if (meta.keywords?.some((k) => k.toLowerCase().startsWith(cleanQuery))) return 60;
  // Substring match on label
  if (label.includes(cleanQuery)) return 50;
  // Substring match on keyword
  if (meta.keywords?.some((k) => k.toLowerCase().includes(cleanQuery))) return 40;
  // Category prefix
  if (meta.category.toLowerCase().startsWith(cleanQuery)) return 30;

  return 10;
}

function calculateMenuPosition(
  selectedFieldId: string | null,
  fields: FormField[],
): { top: number; left: number } {
  if (typeof window === 'undefined') {
    return { top: 100, left: 100 };
  }

  let anchorEl: HTMLElement | null = null;

  // 1. Try selected field
  if (selectedFieldId) {
    anchorEl = document.querySelector(`[data-field-id="${selectedFieldId}"]`);
  }

  // 2. Try last field if no selection but fields exist
  if (!anchorEl && fields.length > 0) {
    const lastField = fields[fields.length - 1];
    anchorEl = document.querySelector(`[data-field-id="${lastField.id}"]`);
  }

  // 3. Fallback to canvas
  if (!anchorEl) {
    anchorEl =
      (document.getElementById(CANVAS_DROPPABLE_ID) as HTMLElement) ||
      (document.querySelector('[data-canvas]') as HTMLElement);
  }

  if (anchorEl) {
    const rect = anchorEl.getBoundingClientRect();
    const isCanvas = anchorEl.id === CANVAS_DROPPABLE_ID || anchorEl.hasAttribute('data-canvas');

    if (isCanvas) {
      const left = Math.max(
        VIEWPORT_PADDING,
        Math.min(rect.left + 32, window.innerWidth - MENU_WIDTH - VIEWPORT_PADDING),
      );
      const top = Math.max(
        VIEWPORT_PADDING,
        Math.min(rect.top + 70, window.innerHeight - ESTIMATED_MENU_HEIGHT - VIEWPORT_PADDING),
      );
      return { top, left };
    }

    // Normal case: below field
    let left = rect.left;
    left = Math.max(
      VIEWPORT_PADDING,
      Math.min(left, window.innerWidth - MENU_WIDTH - VIEWPORT_PADDING),
    );

    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PADDING;
    const spaceAbove = rect.top - VIEWPORT_PADDING;

    let top: number;
    if (spaceBelow >= 260 || spaceBelow >= spaceAbove) {
      top = rect.bottom + 6;
      if (top + ESTIMATED_MENU_HEIGHT > window.innerHeight - VIEWPORT_PADDING) {
        top = Math.max(VIEWPORT_PADDING, window.innerHeight - ESTIMATED_MENU_HEIGHT - VIEWPORT_PADDING);
      }
    } else {
      top = rect.top - 6 - ESTIMATED_MENU_HEIGHT;
      top = Math.max(VIEWPORT_PADDING, top);
    }

    return { top, left };
  }

  // Absolute fallback: centered in viewport
  return {
    top: Math.max(VIEWPORT_PADDING, (window.innerHeight - ESTIMATED_MENU_HEIGHT) / 2),
    left: Math.max(VIEWPORT_PADDING, (window.innerWidth - MENU_WIDTH) / 2),
  };
}

export function QuickAddMenu({
  isOpen,
  onClose,
  onSelect,
  selectedFieldId,
  fields,
}: QuickAddMenuProps) {
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState({ top: 100, left: 100 });

  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update positioning when opening or on viewport resize / container scroll
  useLayoutEffect(() => {
    if (!isOpen) return;

    function updatePosition() {
      setPosition(calculateMenuPosition(selectedFieldId, fields));
    }

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, selectedFieldId, fields]);

  // Focus input and reset query on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isOpen]);

  // Filtered and scored results
  const cleanQuery = query.trim().replace(/^\/+/, '').toLowerCase();

  const matchingItems = useMemo(() => {
    if (!cleanQuery) return FIELD_TYPES;

    return FIELD_TYPES.filter((meta) => {
      const label = (meta.displayLabel ?? meta.label).toLowerCase();
      if (label.includes(cleanQuery)) return true;
      if (meta.type.toLowerCase().includes(cleanQuery)) return true;
      if (meta.category.toLowerCase().includes(cleanQuery)) return true;
      if (meta.keywords?.some((k) => k.toLowerCase().includes(cleanQuery))) return true;
      return false;
    });
  }, [cleanQuery]);

  // Flattened list in category display order, sorted by relevance if searching
  const flatItems = useMemo(() => {
    if (!cleanQuery) {
      // Return in standard CATEGORIES order
      const ordered: FieldTypeMeta[] = [];
      for (const cat of CATEGORIES) {
        for (const type of cat.types) {
          const found = matchingItems.find((m) => m.type === type);
          if (found) ordered.push(found);
        }
      }
      return ordered;
    }

    // Sort by match score descending
    return [...matchingItems].sort((a, b) => scoreMatch(b, cleanQuery) - scoreMatch(a, cleanQuery));
  }, [matchingItems, cleanQuery]);

  // Ensure selectedIndex is always valid and reset to 0 on query change
  useEffect(() => {
    setSelectedIndex(0);
  }, [cleanQuery]);

  // Auto-scroll selected item into view when navigating with keyboard
  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const el = listRef.current.querySelector<HTMLElement>(`[data-index="${selectedIndex}"]`);
      if (el) {
        el.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isOpen, onClose]);

  function handleSelectType(type: FieldType) {
    onSelect(type);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      if (flatItems.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % flatItems.length);
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      if (flatItems.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
      }
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (flatItems.length > 0 && selectedIndex >= 0 && selectedIndex < flatItems.length) {
        handleSelectType(flatItems[selectedIndex].type);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
      return;
    }

    // Stop propagation of backspace/delete so builder shortcuts don't delete fields
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.stopPropagation();
      return;
    }
  }

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      ref={menuRef}
      role="dialog"
      aria-modal="false"
      aria-label="Quick add component"
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${MENU_WIDTH}px`,
        zIndex: 50,
      }}
      className="flex flex-col rounded-xl border border-black/[0.08] bg-white shadow-[0_12px_40px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.04] overflow-hidden select-none animate-in fade-in zoom-in-95 duration-100"
    >
      {/* Search Header */}
      <div className="flex items-center px-3 py-2 border-b border-black/[0.06] bg-black/[0.01]">
        <Search className="h-3.5 w-3.5 text-[#86868B] shrink-0 mr-2" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search components..."
          aria-label="Search components"
          aria-autocomplete="list"
          aria-controls="quick-add-options"
          aria-activedescendant={
            flatItems[selectedIndex] ? `quick-add-${flatItems[selectedIndex].type}` : undefined
          }
          className="w-full bg-transparent text-sm text-[#1D1D1F] placeholder:text-[#86868B] focus:outline-none"
        />
        <kbd className="text-[10px] font-mono text-[#86868B] bg-black/[0.04] px-1.5 py-0.5 rounded border border-black/[0.06]">
          ESC
        </kbd>
      </div>

      {/* Options List */}
      <div
        id="quick-add-options"
        ref={listRef}
        role="listbox"
        className="max-h-[280px] overflow-y-auto p-1.5 space-y-2.5"
      >
        {flatItems.length === 0 ? (
          <div className="py-7 px-4 text-center">
            <p className="text-xs text-[#86868B]">No components found</p>
          </div>
        ) : (
          CATEGORIES.map((category) => {
            const categoryItems = flatItems.filter((item) => category.types.includes(item.type));
            if (categoryItems.length === 0) return null;

            return (
              <div key={category.label} className="space-y-0.5">
                <div
                  className="px-2 py-0.5 text-[10px] font-semibold tracking-wider text-[#86868B] uppercase select-none"
                  role="presentation"
                >
                  {category.label}
                </div>
                {categoryItems.map((meta) => {
                  const itemIndex = flatItems.indexOf(meta);
                  const isSelected = itemIndex === selectedIndex;
                  const Icon = TYPE_ICONS[meta.type] ?? Search;
                  const displayLabel = meta.displayLabel ?? meta.label;

                  return (
                    <button
                      key={meta.type}
                      id={`quick-add-${meta.type}`}
                      role="option"
                      aria-selected={isSelected}
                      type="button"
                      data-index={itemIndex}
                      onClick={() => handleSelectType(meta.type)}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                      className={cn(
                        'group flex h-8 w-full items-center justify-between rounded-lg px-2 text-left text-sm transition-colors cursor-pointer',
                        isSelected
                          ? 'bg-[#007AFF] text-white font-medium shadow-xs'
                          : 'text-[#1D1D1F] hover:bg-black/[0.04]',
                      )}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon
                          className={cn(
                            'h-4 w-4 shrink-0 transition-colors',
                            isSelected ? 'text-white' : 'text-[#86868B] group-hover:text-[#1D1D1F]',
                          )}
                        />
                        <span className="truncate">{displayLabel}</span>
                      </div>
                      {isSelected && (
                        <span className="text-[10px] font-mono text-white/80 shrink-0 pr-1">
                          ↵
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </div>,
    document.body,
  );
}
