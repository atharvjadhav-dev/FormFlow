'use client';

import { useEffect, useEffectEvent } from 'react';

export function isEditingInput(): boolean {
  if (typeof document === 'undefined') return false;
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if ((el as HTMLElement).isContentEditable) return true;
  if (el.closest('[data-properties-panel]')) return true;
  if (el.closest('[role="dialog"]')) return true;
  return false;
}

interface UseShortcutsProps {
  selectedFieldId: string | null;
  onSelect: (id: string | null) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMove: (id: string, delta: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onPreview: () => void;
  onToggleHelp: () => void;
  onNotify: (msg: string) => void;
  onQuickAdd?: () => void;
  isQuickAddOpen?: boolean;
}

export function useShortcuts({
  selectedFieldId,
  onSelect,
  onRemove,
  onDuplicate,
  onMove,
  onUndo,
  onRedo,
  onSave,
  onPreview,
  onToggleHelp,
  onNotify,
  onQuickAdd,
  isQuickAddOpen = false,
}: UseShortcutsProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;
      const isShift = e.shiftKey;
      const key = e.key;

      // 0. QUICK ADD: "/" — Open Quick Add (only when not typing in an input/inspector/dialog)
      if (key === '/' && !isEditingInput() && !isMod && !e.altKey && !isQuickAddOpen) {
        e.preventDefault();
        onQuickAdd?.();
        return;
      }

      // 1. ESC — Clear selection & blur active input (unless Quick Add handles its own close)
      if (key === 'Escape') {
        if (isQuickAddOpen) {
          return;
        }
        if (isEditingInput()) {
          (document.activeElement as HTMLElement)?.blur();
        }
        onSelect(null);
        return;
      }

      // 2. CTRL/CMD + S — Save Draft (Always intercept to prevent browser "Save page" dialog)
      if (isMod && (key === 's' || key === 'S')) {
        e.preventDefault();
        onSave();
        return;
      }

      // 3. CTRL/CMD + ENTER — Preview
      if (isMod && key === 'Enter') {
        e.preventDefault();
        onPreview();
        return;
      }

      // 4. ? — Toggle Shortcuts Reference (only when not typing in an input)
      if (key === '?' && !isEditingInput() && !isMod) {
        e.preventDefault();
        onToggleHelp();
        return;
      }

      // 5. CTRL/CMD + D — Duplicate selected field
      if (isMod && (key === 'd' || key === 'D')) {
        e.preventDefault();
        if (selectedFieldId) {
          onDuplicate(selectedFieldId);
          onNotify('Field duplicated');
        }
        return;
      }

      // -------------------------------------------------------------
      // INPUT SAFETY GATE:
      // The following shortcuts must NEVER fire while the user is typing
      // inside inputs, textareas, selects, or contenteditable elements.
      // -------------------------------------------------------------
      if (isEditingInput()) {
        return;
      }

      // 6. DELETE / BACKSPACE — Delete selected field
      if (key === 'Delete' || key === 'Backspace') {
        if (selectedFieldId) {
          e.preventDefault();
          onRemove(selectedFieldId);
          onNotify('Field deleted');
        }
        return;
      }

      // 7. UNDO: CTRL/CMD + Z (without Shift)
      if (isMod && !isShift && (key === 'z' || key === 'Z')) {
        e.preventDefault();
        onUndo();
        onNotify('Undo');
        return;
      }

      // 8. REDO: CTRL/CMD + SHIFT + Z or CTRL + Y
      if ((isMod && isShift && (key === 'z' || key === 'Z')) || (isMod && (key === 'y' || key === 'Y'))) {
        e.preventDefault();
        onRedo();
        onNotify('Redo');
        return;
      }

      // 9. ARROW UP / DOWN — Move selected field
      if (key === 'ArrowUp' && selectedFieldId) {
        e.preventDefault();
        const delta = isShift ? -3 : -1;
        onMove(selectedFieldId, delta);
        onNotify(isShift ? 'Moved up (jump)' : 'Moved up');
        return;
      }

      if (key === 'ArrowDown' && selectedFieldId) {
        e.preventDefault();
        const delta = isShift ? 3 : 1;
        onMove(selectedFieldId, delta);
        onNotify(isShift ? 'Moved down (jump)' : 'Moved down');
        return;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedFieldId,
    onSelect,
    onRemove,
    onDuplicate,
    onMove,
    onUndo,
    onRedo,
    onSave,
    onPreview,
    onToggleHelp,
    onNotify,
    onQuickAdd,
    isQuickAddOpen,
  ]);
}
