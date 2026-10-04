'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { FormField, FieldType } from '@/db/schema';
import { useBuilder } from '@/components/builder/use-builder';
import { useShortcuts } from '@/components/builder/use-shortcuts';
import { ShortcutsModal } from '@/components/builder/shortcuts-modal';
import { FeedbackToast } from '@/components/builder/feedback-toast';
import { FieldPalette } from '@/components/builder/field-palette';
import { FormCanvas, CANVAS_DROPPABLE_ID } from '@/components/builder/form-canvas';
import { PropertiesPanel } from '@/components/builder/properties-panel';
import { QuickAddMenu } from '@/components/builder/quick-add-menu';
import { VersionHistoryPanel } from '@/components/builder/version-history-panel';
import { getFieldMeta } from '@/lib/field-types';
import { FormScheduler } from '@/components/builder/form-scheduler';
import { saveDraft, publishForm } from '@/app/dashboard/forms/[formId]/actions';
import { ShareDialog, CopyLinkButton } from '@/components/forms/share-dialog';
import {
  ChevronLeft,
  Check,
  Calendar,
  Clock,
  AlertCircle,
  ArrowUpRight,
  Loader2,
  X,
  Undo2,
  Redo2,
  HelpCircle,
  History,
  Laptop,
  Tablet,
  Smartphone,
  Globe2,
} from 'lucide-react';

interface BuilderClientProps {
  formId: string;
  formName: string;
  initialFields: FormField[];
  initialStartAt: string | null;
  initialEndAt: string | null;
  initialTimezone: string;
  publicUrl: string;
}

export function BuilderClient({
  formId,
  formName,
  initialFields,
  initialStartAt,
  initialEndAt,
  initialTimezone,
  publicUrl,
}: BuilderClientProps) {
  const {
    fields,
    selectedFieldId,
    selectedField,
    canUndo,
    canRedo,
    addField,
    removeField,
    duplicateField,
    moveField,
    updateField,
    reorder,
    select,
    undo,
    redo,
    restoreFields,
  } = useBuilder(initialFields);

  const [dragLabel, setDragLabel] = useState<string | null>(null);
  const [startAt, setStartAt] = useState(initialStartAt ?? '');
  const [endAt, setEndAt] = useState(initialEndAt ?? '');
  const [timezone] = useState(initialTimezone);
  const [status, setStatus] = useState<'idle' | 'saved' | 'published' | 'error'>('idle');
  const [canvasViewport, setCanvasViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [activeMobileTab, setActiveMobileTab] = useState<'canvas' | 'palette' | 'properties'>('canvas');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleSaveDraft() {
    startTransition(async () => {
      try {
        await saveDraft(formId, { fields });
        setStatus('saved');
        setToastMessage('Draft saved');
        setTimeout(() => setStatus('idle'), 2500);
      } catch {
        setStatus('error');
        setToastMessage('Failed to save draft');
      }
    });
  }

  // 1-Click Publish: Single action flow, no double-click drawer required
  function handlePublish() {
    startTransition(async () => {
      try {
        await publishForm(formId, {
          schema: { fields },
          startAt: startAt || null,
          endAt: endAt || null,
          timezone,
        });
        setStatus('published');
        setToastMessage('Form published!');
        setTimeout(() => setStatus('idle'), 3500);
      } catch {
        setStatus('error');
        setToastMessage('Failed to publish form');
      }
    });
  }

  function handleRestoreSuccess(newFields: FormField[], versionNumber: number) {
    restoreFields(newFields);
    setToastMessage(`Restored Version ${versionNumber}`);
  }

  function handleQuickAddSelect(type: FieldType) {
    let atIndex = fields.length;
    if (selectedFieldId) {
      const idx = fields.findIndex((f) => f.id === selectedFieldId);
      if (idx !== -1) {
        atIndex = idx + 1;
      }
    }
    addField(type, atIndex);
    setIsQuickAddOpen(false);
    setActiveMobileTab('canvas');
    const meta = getFieldMeta(type);
    setToastMessage(`Added ${meta.displayLabel ?? meta.label}`);
  }

  function handleOpenProperties() {
    setActiveMobileTab('properties');
    setTimeout(() => {
      const labelInput = document.getElementById('field-label') as HTMLInputElement | null;
      if (labelInput) {
        labelInput.focus();
        labelInput.select();
      } else {
        const panel = document.querySelector('[data-properties-panel]') as HTMLElement | null;
        panel?.focus();
      }
      document.querySelector('[data-properties-panel]')?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
    setToastMessage('Properties inspector active');
  }

  // Bind keyboard shortcuts with strict input safety
  useShortcuts({
    selectedFieldId,
    onSelect: select,
    onRemove: removeField,
    onDuplicate: duplicateField,
    onMove: moveField,
    onUndo: undo,
    onRedo: redo,
    onSave: handleSaveDraft,
    onPreview: () => window.open(publicUrl, '_blank'),
    onToggleHelp: () => setIsHelpOpen((prev) => !prev),
    onNotify: (msg) => setToastMessage(msg),
    onQuickAdd: () => setIsQuickAddOpen(true),
    isQuickAddOpen,
  });

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as { source: 'palette'; fieldType: FieldType } | undefined;
    if (data?.source === 'palette') setDragLabel(getFieldMeta(data.fieldType).label);
    else setDragLabel(fields.find((f) => f.id === event.active.id)?.label ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setDragLabel(null);
    const { active, over } = event;
    if (!over) return;

    const data = active.data.current as { source: 'palette'; fieldType: FieldType } | undefined;

    if (data?.source === 'palette') {
      const overIndex = fields.findIndex((f) => f.id === over.id);
      const atIndex = over.id === CANVAS_DROPPABLE_ID || overIndex === -1 ? fields.length : overIndex;
      addField(data.fieldType, atIndex);
      return;
    }

    if (active.id !== over.id) {
      const fromIndex = fields.findIndex((f) => f.id === active.id);
      const toIndex = fields.findIndex((f) => f.id === over.id);
      if (fromIndex !== -1 && toIndex !== -1) reorder(fromIndex, toIndex);
    }
  }

  const cleanSlug = publicUrl.replace('/f/', '');

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col bg-[#F5F5F7] text-[#1D1D1F] overflow-hidden">
      {/* Clean Studio Navigation Header */}
      <header className="sticky top-0 z-30 flex h-13 items-center justify-between border-b border-black/[0.06] bg-white/95 px-2.5 sm:px-5 backdrop-blur-md shrink-0 select-none">
        {/* Left: Breadcrumbs */}
        <div className="flex items-center gap-1 sm:gap-2.5 min-w-0">
          <Link
            href="/dashboard/forms"
            className="flex items-center gap-1 text-xs sm:text-sm font-medium text-[#86868B] hover:text-[#1D1D1F] transition-colors shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden xs:inline">Forms</span>
          </Link>

          <span className="text-black/[0.15] shrink-0">/</span>

          <h1 className="text-xs sm:text-sm font-semibold text-[#1D1D1F] truncate max-w-[80px] xs:max-w-[140px] sm:max-w-[200px] md:max-w-[260px]">{formName}</h1>
        </div>

        {/* Right: Actions & Tools */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Undo / Redo & Shortcuts Help */}
          <div className="hidden sm:flex items-center gap-1 pr-2 border-r border-black/[0.06]">
            <button
              type="button"
              disabled={!canUndo}
              onClick={undo}
              title="Undo (Ctrl+Z)"
              className="p-1.5 rounded-lg text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/[0.04] disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={!canRedo}
              onClick={redo}
              title="Redo (Ctrl+Shift+Z)"
              className="p-1.5 rounded-lg text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/[0.04] disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <Redo2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsHelpOpen(true)}
              title="Keyboard Shortcuts (?)"
              className="p-1.5 rounded-lg text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/[0.04] transition-colors"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsHistoryOpen(true)}
              title="Version History"
              className="flex items-center gap-1.5 h-7 px-2 rounded-lg text-xs font-medium text-[#1D1D1F] hover:bg-black/[0.04] transition-colors border border-black/[0.08]"
            >
              <History className="h-3.5 w-3.5 text-[#86868B]" />
              <span className="hidden md:inline">History</span>
            </button>
          </div>

          {/* Viewport switch toolbar */}
          <div className="hidden lg:flex items-center bg-[#FAFAFA] rounded-lg p-0.5 border border-black/[0.08] shadow-craft-sm">
            <button
              type="button"
              onClick={() => setCanvasViewport('desktop')}
              className={`p-1 rounded text-xs transition-all ${
                canvasViewport === 'desktop' ? 'bg-[#18181B] text-white shadow-2xs' : 'text-[#71717A] hover:text-[#18181B]'
              }`}
              title="Desktop preview"
            >
              <Laptop className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setCanvasViewport('tablet')}
              className={`p-1 rounded text-xs transition-all ${
                canvasViewport === 'tablet' ? 'bg-[#18181B] text-white shadow-2xs' : 'text-[#71717A] hover:text-[#18181B]'
              }`}
              title="Tablet preview (500px)"
            >
              <Tablet className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setCanvasViewport('mobile')}
              className={`p-1 rounded text-xs transition-all ${
                canvasViewport === 'mobile' ? 'bg-[#18181B] text-white shadow-2xs' : 'text-[#71717A] hover:text-[#18181B]'
              }`}
              title="Mobile preview (360px)"
            >
              <Smartphone className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 pr-2 border-r border-black/[0.06]">
            <span className="text-xs text-[#86868B] font-mono bg-black/[0.03] px-2 py-0.5 rounded">
              {publicUrl}
            </span>
            <CopyLinkButton slug={cleanSlug} />
            <ShareDialog formTitle={formName} slug={cleanSlug} />
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs font-medium text-[#007AFF] hover:underline px-1"
            >
              <span>Preview</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>

          {status === 'published' && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 sm:px-2.5 py-1 rounded-md border border-emerald-100">
              <Check className="h-3.5 w-3.5" /> Published
            </span>
          )}
          {status === 'saved' && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 sm:px-2.5 py-1 rounded-md border border-emerald-100">
              <Check className="h-3.5 w-3.5" /> Saved
            </span>
          )}
          {status === 'error' && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 bg-rose-50 px-2 sm:px-2.5 py-1 rounded-md border border-rose-100">
              <AlertCircle className="h-3.5 w-3.5" /> Failed
            </span>
          )}

          <button
            type="button"
            disabled={isPending}
            onClick={handleSaveDraft}
            className="h-8 rounded-lg border border-black/[0.1] bg-white px-2.5 sm:px-3.5 text-xs sm:text-sm font-medium text-[#1D1D1F] hover:bg-black/[0.03] active:bg-black/[0.06] transition-colors disabled:opacity-50"
          >
            Save Draft
          </button>

          {/* 1-Click Direct Publish Button */}
          <button
            type="button"
            disabled={isPending}
            onClick={handlePublish}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-[#18181B] px-3 sm:px-4 text-xs sm:text-sm font-medium text-white hover:bg-black active:bg-zinc-900 shadow-sm transition-all disabled:opacity-50 btn-press"
          >
            {isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span className="hidden xs:inline">Publishing...</span>
              </>
            ) : (
              <>
                <Globe2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Publish</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Mobile Tab Switcher */}
      <div className="lg:hidden flex items-center justify-around border-b border-black/[0.06] bg-white px-2 py-1.5 shrink-0 text-xs font-medium gap-1.5">
        <button
          type="button"
          onClick={() => setActiveMobileTab('palette')}
          className={`flex-1 py-1.5 px-2 text-center rounded-lg transition-colors ${
            activeMobileTab === 'palette'
              ? 'bg-[#18181B] text-white font-semibold shadow-xs'
              : 'text-[#86868B] hover:text-[#1D1D1F]'
          }`}
        >
          + Add Fields
        </button>
        <button
          type="button"
          onClick={() => setActiveMobileTab('canvas')}
          className={`flex-1 py-1.5 px-2 text-center rounded-lg transition-colors ${
            activeMobileTab === 'canvas'
              ? 'bg-[#18181B] text-white font-semibold shadow-xs'
              : 'text-[#86868B] hover:text-[#1D1D1F]'
          }`}
        >
          Canvas ({fields.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveMobileTab('properties')}
          className={`flex-1 py-1.5 px-2 text-center rounded-lg transition-colors ${
            activeMobileTab === 'properties'
              ? 'bg-[#18181B] text-white font-semibold shadow-xs'
              : 'text-[#86868B] hover:text-[#1D1D1F]'
          }`}
        >
          Properties {selectedField ? '•' : ''}
        </button>
      </div>

      {/* Studio 3-Pane Body */}
      <DndContext id="form-builder-dnd" sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex flex-col lg:grid flex-1 lg:grid-cols-[240px_1fr_300px] overflow-hidden min-h-0">
          {/* Left Palette */}
          <aside
            className={`overflow-y-auto border-r border-black/[0.06] bg-white/70 backdrop-blur-sm ${
              activeMobileTab === 'palette' ? 'flex-1' : 'hidden lg:block'
            }`}
          >
            <FieldPalette
              onAdd={(type) => {
                addField(type);
                setActiveMobileTab('canvas');
              }}
            />
          </aside>

          {/* Center Canvas with End Section */}
          <main
            className={`overflow-y-auto bg-[#F4F4F5]/50 bg-dot-pattern py-4 sm:py-8 px-3 sm:px-6 ${
              activeMobileTab === 'canvas' ? 'flex-1' : 'hidden lg:block'
            }`}
          >
            <div
              className={`mx-auto transition-all duration-200 space-y-6 ${
                canvasViewport === 'desktop'
                  ? 'max-w-2xl'
                  : canvasViewport === 'tablet'
                  ? 'max-w-[500px]'
                  : 'max-w-[360px]'
              }`}
            >
              <FormCanvas
                formTitle={formName}
                fields={fields}
                selectedFieldId={selectedFieldId}
                isDraggingActive={Boolean(dragLabel)}
                onSelect={select}
                onRemove={removeField}
                onDuplicate={duplicateField}
                onAdd={(type) => addField(type)}
                onUpdate={(id, patch) => updateField(id, patch)}
                onOpenProperties={handleOpenProperties}
                isQuickAddOpen={isQuickAddOpen}
              />

              {/* End of Form: Schedule & Link Section */}
              <div className="rounded-2xl border border-black/[0.08] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-5 text-sm">
                <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
                  <div>
                    <h3 className="text-sm font-semibold text-[#1D1D1F]">Form Schedule &amp; Share</h3>
                    <p className="text-xs text-[#86868B]">Set launch or expiration dates and grab your public link.</p>
                  </div>
                  <span className="text-xs font-mono text-[#86868B] bg-black/[0.03] px-2 py-0.5 rounded">
                    {timezone}
                  </span>
                </div>

                {/* Public Link Box */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-black/[0.06] bg-[#F5F5F7]/80 p-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#86868B]">Public Share Link</p>
                    <p className="font-mono text-sm font-medium text-[#1D1D1F] truncate mt-0.5">{publicUrl}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <CopyLinkButton slug={cleanSlug} />
                    <ShareDialog formTitle={formName} slug={cleanSlug} />
                    <a
                      href={publicUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-black/[0.1] bg-white px-3 py-1.5 text-xs font-medium text-[#007AFF] hover:bg-black/[0.03] transition-all"
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      Open
                    </a>
                  </div>
                </div>

                {/* Easy, Human-Friendly Form Scheduler */}
                <FormScheduler
                  startAt={startAt}
                  endAt={endAt}
                  timezone={timezone}
                  onStartAtChange={setStartAt}
                  onEndAtChange={setEndAt}
                />

                {/* Bottom Action Footer */}
                <div className="flex items-center justify-end pt-3 border-t border-black/[0.06]">

                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handlePublish}
                    className="flex h-8 items-center gap-1.5 rounded-lg bg-[#18181B] px-4 text-sm font-medium text-white hover:bg-black active:bg-zinc-900 shadow-sm transition-all disabled:opacity-50 btn-press"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Publishing...</span>
                      </>
                    ) : (
                      <>
                        <Globe2 className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Publish Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </main>

          {/* Right Inspector */}
          <aside
            data-properties-panel
            className={`overflow-y-auto border-l border-black/[0.06] bg-white/70 backdrop-blur-sm ${
              activeMobileTab === 'properties' ? 'flex-1' : 'hidden lg:block'
            }`}
          >
            <PropertiesPanel
              field={selectedField}
              allFields={fields}
              onChange={(patch) => selectedFieldId && updateField(selectedFieldId, patch)}
            />
          </aside>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {dragLabel && (
            <div className="rounded-lg border border-[#007AFF] bg-white px-3.5 py-2 text-sm font-medium text-[#1D1D1F] shadow-xl ring-2 ring-[#007AFF]/20">
              {dragLabel}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Keyboard Shortcuts Reference Modal */}
      <ShortcutsModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      {/* Quick Add Slash Command Floating Menu */}
      <QuickAddMenu
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSelect={handleQuickAddSelect}
        selectedFieldId={selectedFieldId}
        fields={fields}
      />

      {/* Action Notification Pill */}
      <FeedbackToast message={toastMessage} onClear={() => setToastMessage(null)} />

      {/* Version History Slide-Over Panel */}
      <VersionHistoryPanel
        formId={formId}
        formName={formName}
        currentFields={fields}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onRestoreSuccess={handleRestoreSuccess}
      />
    </div>
  );
}
