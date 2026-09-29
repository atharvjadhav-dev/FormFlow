'use client';

import React, { useState, useMemo } from 'react';
import type { FormField, FieldWidth, FieldType } from '@/db/schema';
import { getFieldWidthClass, getFieldWidthFraction, FIELD_TYPES } from '@/lib/field-types';
import { FieldRenderer } from '@/components/forms/field-renderer';
import { isFieldVisible } from '@/lib/form-schema';
import {
  Type,
  Mail,
  Calendar,
  ChevronDown,
  CheckCircle2,
  CheckSquare,
  UploadCloud,
  Heading,
  Plus,
  Trash2,
  Copy,
  Eye,
  Edit3,
  Undo2,
  Redo2,
  GitBranch,
  SlidersHorizontal,
  X,
  Check,
  Phone,
  AlignLeft,
  Laptop,
  Tablet,
  Smartphone,
  Wand2,
} from 'lucide-react';

const INITIAL_DEMO_FIELDS: FormField[] = [
  {
    id: 'demo_fname',
    type: 'text',
    label: 'Full Name',
    placeholder: 'Jane Doe',
    required: true,
    width: 6,
  },
  {
    id: 'demo_email',
    type: 'email',
    label: 'Work Email',
    placeholder: 'jane@company.com',
    required: true,
    width: 6,
  },
  {
    id: 'demo_dept',
    type: 'dropdown',
    label: 'Department',
    placeholder: 'Select department',
    options: ['Engineering', 'Product', 'Marketing', 'Sales', 'Design'],
    required: true,
    width: 6,
  },
  {
    id: 'demo_start_date',
    type: 'date',
    label: 'Start Date',
    required: true,
    width: 6,
  },
  {
    id: 'demo_emp_type',
    type: 'radio',
    label: 'Employment Type',
    options: ['Full-time', 'Part-time', 'Contractor'],
    required: true,
    width: 12,
  },
  {
    id: 'demo_benefits',
    type: 'dropdown',
    label: 'Benefits Enrollment',
    placeholder: 'Choose benefit tier',
    options: ['Comprehensive Health & Dental', 'Standard Healthcare Only', 'Opt-out / Waived'],
    required: false,
    width: 12,
    visibleIf: {
      conditions: [{ fieldId: 'demo_emp_type', operator: 'equals', value: 'Full-time' }],
      combinator: 'and',
      fieldId: 'demo_emp_type',
      operator: 'equals',
      value: 'Full-time',
    },
  },
  {
    id: 'demo_emergency',
    type: 'text',
    label: 'Emergency Contact',
    placeholder: 'Name & Phone number',
    required: false,
    width: 12,
  },
];

const SCHOLARSHIP_PRESET: FormField[] = [
  { id: 'sch_name', type: 'text', label: 'Applicant Legal Name', placeholder: 'Legal full name', required: true, width: 6 },
  { id: 'sch_email', type: 'email', label: 'Student Email (.edu)', placeholder: 'student@university.edu', required: true, width: 6 },
  { id: 'sch_gpa', type: 'text', label: 'Cumulative GPA', placeholder: '3.85', required: true, width: 4 },
  { id: 'sch_major', type: 'text', label: 'Declared Major', placeholder: 'Computer Science', required: true, width: 4 },
  { id: 'sch_grad_year', type: 'text', label: 'Expected Graduation', placeholder: '2027', required: true, width: 4 },
  { id: 'sch_need', type: 'radio', label: 'Applying for Need-Based Aid?', options: ['Yes', 'No'], required: true, width: 12 },
  {
    id: 'sch_income',
    type: 'dropdown',
    label: 'Household Income Bracket',
    placeholder: 'Select bracket',
    options: ['Under $30,000', '$30,000 - $60,000', '$60,000 - $100,000', '$100,000+'],
    required: false,
    width: 12,
    visibleIf: {
      conditions: [{ fieldId: 'sch_need', operator: 'equals', value: 'Yes' }],
      combinator: 'and',
      fieldId: 'sch_need',
      operator: 'equals',
      value: 'Yes',
    },
  },
  { id: 'sch_transcript', type: 'file', label: 'Official Academic Transcript (PDF)', required: true, width: 12 },
];

const PALETTE_ITEMS: { type: FieldType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { type: 'text', label: 'Text Input', icon: Type },
  { type: 'email', label: 'Email', icon: Mail },
  { type: 'phone', label: 'Phone', icon: Phone },
  { type: 'date', label: 'Date Picker', icon: Calendar },
  { type: 'dropdown', label: 'Dropdown', icon: ChevronDown },
  { type: 'radio', label: 'Single Choice', icon: CheckCircle2 },
  { type: 'checkbox', label: 'Checkboxes', icon: CheckSquare },
  { type: 'textarea', label: 'Long Text', icon: AlignLeft },
  { type: 'file', label: 'File Upload', icon: UploadCloud },
  { type: 'heading', label: 'Section Header', icon: Heading },
];

const WIDTH_OPTIONS: { value: FieldWidth; label: string; fraction: string }[] = [
  { value: 12, label: 'Full', fraction: '12/12' },
  { value: 6, label: 'Half', fraction: '1/2' },
  { value: 4, label: '1/3', fraction: '1/3' },
  { value: 8, label: '2/3', fraction: '2/3' },
];

export function InteractiveDemo() {
  const [fields, setFields] = useState<FormField[]>(INITIAL_DEMO_FIELDS);
  const [selectedFieldId, setSelectedFieldId] = useState<string>('demo_fname');
  const [history, setHistory] = useState<FormField[][]>([INITIAL_DEMO_FIELDS]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Viewport mode inside the demo
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // Preview Mode Toggle
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, unknown>>({
    demo_emp_type: 'Full-time',
    sch_need: 'Yes',
  });

  // UI Modals
  const [isAddPickerOpen, setIsAddPickerOpen] = useState(false);
  const [isAiPresetOpen, setIsAiPresetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'canvas' | 'palette' | 'inspector'>('canvas');

  const selectedField = useMemo(
    () => fields.find((f) => f.id === selectedFieldId) || fields[0] || null,
    [fields, selectedFieldId],
  );

  const commitChange = (newFields: FormField[]) => {
    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(newFields);
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
    setFields(newFields);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const target = historyIndex - 1;
      setHistoryIndex(target);
      setFields(history[target]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const target = historyIndex + 1;
      setHistoryIndex(target);
      setFields(history[target]);
    }
  };

  const updateSelectedField = (patch: Partial<FormField>) => {
    if (!selectedField) return;
    const updated = fields.map((f) => (f.id === selectedField.id ? { ...f, ...patch } : f));
    commitChange(updated);
  };

  const handleAddField = (type: FieldType) => {
    const newField: FormField = {
      id: `demo_${Date.now()}`,
      type,
      label: type === 'heading' ? 'New Section' : `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      placeholder: 'Enter response...',
      required: false,
      width: type === 'heading' ? 12 : 6,
      options: type === 'dropdown' || type === 'radio' || type === 'checkbox' ? ['Option 1', 'Option 2'] : undefined,
    };
    const next = [...fields, newField];
    commitChange(next);
    setSelectedFieldId(newField.id);
    setIsAddPickerOpen(false);
  };

  const handleDuplicateField = (fieldId: string) => {
    const target = fields.find((f) => f.id === fieldId);
    if (!target) return;
    const dup: FormField = {
      ...target,
      id: `demo_${Date.now()}`,
      label: `${target.label} (Copy)`,
    };
    const idx = fields.findIndex((f) => f.id === fieldId);
    const next = [...fields];
    next.splice(idx + 1, 0, dup);
    commitChange(next);
    setSelectedFieldId(dup.id);
  };

  const handleDeleteField = (fieldId: string) => {
    if (fields.length <= 1) return;
    const next = fields.filter((f) => f.id !== fieldId);
    commitChange(next);
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(next[0].id);
    }
  };

  const loadPreset = (presetFields: FormField[]) => {
    commitChange(presetFields);
    setSelectedFieldId(presetFields[0].id);
    setIsAiPresetOpen(false);
  };

  return (
    <section id="demo" className="scroll-mt-20 max-w-6xl mx-auto px-4 sm:px-6 py-12">
      {/* Outer Browser Window Chrome */}
      <div className="rounded-2xl border border-black/[0.12] bg-white shadow-craft-lg overflow-hidden transition-all">
        {/* Top Window Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#FAFAFA] border-b border-black/[0.08]">
          {/* Traffic Lights */}
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#FF5F56]/80 border border-[#E0443E]/40" />
            <span className="h-3 w-3 rounded-full bg-[#FFBD2E]/80 border border-[#DEA123]/40" />
            <span className="h-3 w-3 rounded-full bg-[#27C93F]/80 border border-[#1AAB29]/40" />
            <span className="ml-2 text-xs font-semibold text-[#18181B] hidden sm:inline">
              FormFlow Studio — Live Playground
            </span>
          </div>

          {/* Viewport switcher in title bar */}
          <div className="flex items-center bg-white rounded-lg p-0.5 border border-black/[0.08] shadow-craft-sm">
            <button
              type="button"
              onClick={() => setViewport('desktop')}
              className={`p-1 rounded text-xs transition-all ${
                viewport === 'desktop' ? 'bg-[#18181B] text-white shadow-2xs' : 'text-[#71717A] hover:text-[#18181B]'
              }`}
              title="Desktop (100%)"
            >
              <Laptop className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewport('tablet')}
              className={`p-1 rounded text-xs transition-all ${
                viewport === 'tablet' ? 'bg-[#18181B] text-white shadow-2xs' : 'text-[#71717A] hover:text-[#18181B]'
              }`}
              title="Tablet (768px)"
            >
              <Tablet className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewport('mobile')}
              className={`p-1 rounded text-xs transition-all ${
                viewport === 'mobile' ? 'bg-[#18181B] text-white shadow-2xs' : 'text-[#71717A] hover:text-[#18181B]'
              }`}
              title="Mobile (375px)"
            >
              <Smartphone className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-2 text-xs text-[#71717A]">
            <span className="hidden md:inline font-mono text-[11px]">{fields.length} inputs</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Interactive
            </span>
          </div>
        </div>

        {/* Builder Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-white border-b border-black/[0.06]">
          {/* Left Actions: Undo / Redo & Add Field */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-1.5 rounded-lg text-[#71717A] hover:text-[#18181B] hover:bg-black/[0.04] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Undo change (⌘Z)"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-1.5 rounded-lg text-[#71717A] hover:text-[#18181B] hover:bg-black/[0.04] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Redo change"
            >
              <Redo2 className="h-4 w-4" />
            </button>

            <div className="h-4 w-px bg-black/[0.08] mx-1" />

            {/* + Add Field Button with popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsAddPickerOpen(!isAddPickerOpen)}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-black/[0.1] bg-white text-xs font-semibold text-[#18181B] hover:bg-zinc-50 transition-colors shadow-craft-sm"
              >
                <Plus className="h-3.5 w-3.5 text-[#71717A]" />
                <span>Add component</span>
              </button>

              {isAddPickerOpen && (
                <div className="absolute top-10 left-0 z-30 w-52 rounded-xl border border-black/[0.1] bg-white p-1.5 shadow-craft-lg animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase text-[#71717A]">
                    Components
                  </div>
                  <div className="space-y-0.5">
                    {PALETTE_ITEMS.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => handleAddField(item.type)}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-[#18181B] hover:bg-black/[0.04] transition-colors text-left"
                        >
                          <Icon className="h-3.5 w-3.5 text-[#71717A]" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Preset Blueprint Switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsAiPresetOpen(!isAiPresetOpen)}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-black/[0.1] bg-white text-xs font-semibold text-[#18181B] hover:bg-zinc-50 transition-colors shadow-craft-sm"
              >
                <Wand2 className="h-3.5 w-3.5 text-[#007AFF]" />
                <span>Templates</span>
              </button>

              {isAiPresetOpen && (
                <div className="absolute top-10 left-0 z-30 w-64 rounded-xl border border-black/[0.1] bg-white p-2 shadow-craft-lg animate-in fade-in zoom-in-95 duration-100 space-y-1">
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase text-[#71717A]">
                    Load Blueprint
                  </div>
                  <button
                    type="button"
                    onClick={() => loadPreset(INITIAL_DEMO_FIELDS)}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-[#18181B] hover:bg-black/[0.04] text-left"
                  >
                    <span>Employee Onboarding</span>
                    <span className="kbd-pill">7 fields</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => loadPreset(SCHOLARSHIP_PRESET)}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-[#18181B] hover:bg-black/[0.04] text-left"
                  >
                    <span>Scholarship Intake</span>
                    <span className="kbd-pill">8 fields</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Tab Switcher */}
          <div className="flex lg:hidden items-center rounded-lg bg-black/[0.04] p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('canvas')}
              className={`px-3 py-1 rounded-md transition-all ${
                activeTab === 'canvas' ? 'bg-white text-[#18181B] shadow-2xs font-semibold' : 'text-[#71717A]'
              }`}
            >
              Canvas
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('palette')}
              className={`px-3 py-1 rounded-md transition-all ${
                activeTab === 'palette' ? 'bg-white text-[#18181B] shadow-2xs font-semibold' : 'text-[#71717A]'
              }`}
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('inspector')}
              className={`px-3 py-1 rounded-md transition-all ${
                activeTab === 'inspector' ? 'bg-white text-[#18181B] shadow-2xs font-semibold' : 'text-[#71717A]'
              }`}
            >
              Properties
            </button>
          </div>

          {/* Right Mode Toggle: Builder vs Public Form Preview */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className={`flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-xs font-semibold transition-all shadow-craft-sm btn-press ${
                isPreviewMode
                  ? 'bg-[#18181B] text-white hover:bg-black'
                  : 'border border-black/[0.1] bg-white text-[#18181B] hover:bg-zinc-50'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>{isPreviewMode ? 'Back to Editor' : 'Test Live Form'}</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* Main 3-Column Studio Workspace */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-12 min-h-[460px] bg-[#FAFAFA] divide-y lg:divide-y-0 lg:divide-x divide-black/[0.08]">
          {/* 1. LEFT PALETTE */}
          <div
            className={`col-span-12 lg:col-span-3 bg-white p-4 space-y-4 ${
              activeTab === 'palette' ? 'block' : 'hidden lg:block'
            }`}
          >
            <div>
              <p className="text-xs font-semibold text-[#18181B]">Component Library</p>
              <p className="text-[11px] text-[#71717A]">Click to add into 12-col grid</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-1 gap-1">
              {PALETTE_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => handleAddField(item.type)}
                    className="group flex h-8 items-center justify-between rounded-lg px-2.5 text-xs text-[#18181B] hover:bg-black/[0.04] transition-colors text-left"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Icon className="h-3.5 w-3.5 text-[#71717A] group-hover:text-[#18181B]" />
                      <span className="truncate">{item.label}</span>
                    </div>
                    <Plus className="h-3 w-3 text-[#71717A] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. CENTER CANVAS */}
          <div
            className={`col-span-12 lg:col-span-6 p-4 sm:p-6 overflow-y-auto max-h-[580px] bg-[#F4F4F5]/50 bg-dot-pattern ${
              activeTab === 'canvas' ? 'block' : 'hidden lg:block'
            }`}
          >
            <div
              className={`mx-auto transition-all duration-200 ${
                viewport === 'desktop'
                  ? 'max-w-xl'
                  : viewport === 'tablet'
                  ? 'max-w-[440px]'
                  : 'max-w-[320px]'
              }`}
            >
              <div className="bg-white rounded-2xl border border-black/[0.08] p-5 sm:p-6 shadow-craft space-y-5">
                {/* Form Header */}
                <div className="border-b border-black/[0.06] pb-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold tracking-tight text-[#18181B]">
                      Registration Form
                    </h3>
                    <span className="kbd-pill">{viewport.toUpperCase()}</span>
                  </div>
                  <p className="text-xs text-[#71717A] mt-0.5">
                    Structured submission with responsive fields and conditional branches.
                  </p>
                </div>

                {/* 12-Column Responsive Grid */}
                <div className={`grid gap-x-3 gap-y-4 ${viewport === 'mobile' ? 'grid-cols-1' : 'grid-cols-12'}`}>
                  {fields.map((field) => {
                    const widthClass = viewport === 'mobile' ? 'col-span-1' : getFieldWidthClass(field.width);
                    const isSelected = selectedField?.id === field.id && !isPreviewMode;
                    const isVisibleInPreview = !isPreviewMode || isFieldVisible(field, previewAnswers);

                    if (!isVisibleInPreview) {
                      return null;
                    }

                    const hasConditional = Boolean(field.visibleIf);

                    return (
                      <div
                        key={field.id}
                        onClick={() => {
                          if (!isPreviewMode) {
                            setSelectedFieldId(field.id);
                          }
                        }}
                        className={`${widthClass} relative group transition-all duration-150 ${
                          !isPreviewMode ? 'cursor-pointer' : ''
                        }`}
                      >
                        {/* Selection Outline & Floating Contextual Toolbar */}
                        <div
                          className={`rounded-xl transition-all ${
                            isSelected
                              ? 'ring-2 ring-[#007AFF] bg-[#007AFF]/[0.02] p-2 -m-2'
                              : !isPreviewMode
                              ? 'hover:ring-1 hover:ring-black/[0.12] p-1.5 -m-1.5 rounded-lg'
                              : ''
                          }`}
                        >
                          {/* Floating Contextual Toolbar when selected */}
                          {isSelected && !isPreviewMode && (
                            <div className="mb-2 flex items-center justify-between gap-1 rounded-lg bg-[#18181B] px-2 py-1 text-white shadow-craft-lg animate-in fade-in duration-100">
                              {/* Width quick changer */}
                              <div className="flex items-center gap-1 text-[11px] font-mono">
                                {WIDTH_OPTIONS.map((opt) => (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateSelectedField({ width: opt.value });
                                    }}
                                    className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                                      (field.width ?? 12) === opt.value
                                        ? 'bg-[#007AFF] text-white font-bold'
                                        : 'text-zinc-400 hover:text-white hover:bg-white/10'
                                    }`}
                                    title={`Set width to ${opt.label}`}
                                  >
                                    {opt.fraction}
                                  </button>
                                ))}
                              </div>

                              <div className="h-3 w-px bg-white/20 mx-1" />

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDuplicateField(field.id);
                                  }}
                                  className="p-1 rounded hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
                                  title="Duplicate field (⌘D)"
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteField(field.id);
                                  }}
                                  className="p-1 rounded hover:bg-rose-500/30 text-rose-300 hover:text-rose-100 transition-colors"
                                  title="Delete field"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Render Field */}
                          <FieldRenderer
                            field={field}
                            value={previewAnswers[field.id]}
                            onChange={(val) => {
                              setPreviewAnswers((prev) => ({ ...prev, [field.id]: val }));
                            }}
                            disabled={!isPreviewMode}
                            labelExtra={
                              hasConditional ? (
                                <span
                                  title="Visible conditionally"
                                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.2 text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                                >
                                  <GitBranch className="h-2.5 w-2.5 text-emerald-600" />
                                  <span>Branching</span>
                                </span>
                              ) : null
                            }
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Preview mode interactive instructions */}
                {isPreviewMode && (
                  <div className="pt-3 border-t border-black/[0.06] text-center text-xs text-[#52525B]">
                    💡 <strong>Live Test:</strong> Conditional rules are active. Change answers above to see dependent fields react in real time.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. RIGHT INSPECTOR */}
          <div
            className={`col-span-12 lg:col-span-3 bg-white p-4 space-y-5 select-none ${
              activeTab === 'inspector' ? 'block' : 'hidden lg:block'
            }`}
          >
            {selectedField ? (
              <div className="space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-black/[0.06]">
                  <div>
                    <p className="text-xs font-semibold text-[#18181B]">Element Inspector</p>
                    <p className="text-[11px] text-[#71717A]">Edit properties</p>
                  </div>
                  <span className="kbd-pill uppercase">
                    {selectedField.type}
                  </span>
                </div>

                {/* Width Control */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-medium text-[#18181B]">12-Col Span</label>
                    <span className="font-mono text-[11px] text-[#007AFF] font-semibold">
                      {getFieldWidthFraction(selectedField.width)}
                    </span>
                  </div>
                  <select
                    value={selectedField.width ?? 12}
                    onChange={(e) => updateSelectedField({ width: Number(e.target.value) as FieldWidth })}
                    className="h-8 w-full rounded-lg border border-black/[0.1] bg-white px-2.5 text-xs text-[#18181B] focus:outline-none focus:border-[#007AFF]"
                  >
                    <option value={12}>Full span (12/12)</option>
                    <option value={6}>Half span (6/12)</option>
                    <option value={4}>One third (4/12)</option>
                    <option value={8}>Two thirds (8/12)</option>
                  </select>
                </div>

                {/* Label Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#18181B]">Field Label</label>
                  <input
                    type="text"
                    value={selectedField.label}
                    onChange={(e) => updateSelectedField({ label: e.target.value })}
                    className="h-8 w-full rounded-lg border border-black/[0.1] bg-white px-2.5 text-xs text-[#18181B] focus:outline-none focus:border-[#007AFF]"
                  />
                </div>

                {/* Placeholder (if applicable) */}
                {selectedField.type !== 'heading' && selectedField.type !== 'radio' && selectedField.type !== 'checkbox' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#18181B]">Placeholder Hint</label>
                    <input
                      type="text"
                      value={selectedField.placeholder || ''}
                      onChange={(e) => updateSelectedField({ placeholder: e.target.value })}
                      className="h-8 w-full rounded-lg border border-black/[0.1] bg-white px-2.5 text-xs text-[#18181B] focus:outline-none focus:border-[#007AFF]"
                    />
                  </div>
                )}

                {/* Required Toggle */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-medium text-[#18181B]">Required validation</span>
                  <input
                    type="checkbox"
                    checked={Boolean(selectedField.required)}
                    onChange={(e) => updateSelectedField({ required: e.target.checked })}
                    className="h-4 w-4 rounded text-[#007AFF] focus:ring-[#007AFF]"
                  />
                </div>

                {/* Conditional Logic Display */}
                <div className="pt-3 border-t border-black/[0.06] space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#18181B]">
                    <GitBranch className="h-3.5 w-3.5 text-[#007AFF]" />
                    <span>Branching Logic</span>
                  </div>
                  {selectedField.visibleIf ? (
                    <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-2.5 text-[11px] text-emerald-900 space-y-1">
                      <p className="font-semibold">visibleIf rule active</p>
                      <p className="text-[10px] text-emerald-700 leading-relaxed font-mono">
                        Triggered on condition match
                      </p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#71717A]">
                      Always displayed on this form.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#71717A] text-center py-10">Select an element to view properties</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
