'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { generateFormSchemaAction } from '@/lib/ai/actions';
import { createFormFromAiSchema } from '@/app/dashboard/forms/actions';
import type { AiGenerationOptions, NormalizedAiFormSchema } from '@/lib/ai/types';
import { FieldRenderer } from '@/components/forms/field-renderer';
import { getFieldWidthClass } from '@/lib/field-types';
import {
  Wand2,
  ArrowRight,
  RotateCcw,
  Edit3,
  Loader2,
  GitBranch,
  AlertCircle,
  CheckCircle2,
  SlidersHorizontal,
  ChevronLeft,
  FileCheck2,
  Laptop,
  Tablet,
  Smartphone,
  Sparkles,
} from 'lucide-react';

const EXAMPLE_PROMPTS = [
  'B2B customer onboarding with company size, primary cloud provider, and billing details',
  'Graduate scholarship intake collecting GPA, declared major, household income, and PDF transcript',
  'Product bug report with severity tier, reproduction steps, browser dropdown, and error log',
  'Executive event registration with keynote session choices, dietary restrictions, and hotel stay',
];

const GENERATION_STEPS = [
  'Parsing form requirements & entity structure',
  'Mapping fields into responsive 12-column grid pairs',
  'Synthesizing conditional visibility & input validations',
  'Finalizing schema blueprint',
];

interface AiFormGeneratorProps {
  onBackToOverview?: () => void;
}

export function AiFormGenerator({ onBackToOverview }: AiFormGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [viewState, setViewState] = useState<'input' | 'generating' | 'preview'>('input');
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Optional Generation Options
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [fieldCount, setFieldCount] = useState<'auto' | 'compact' | 'standard' | 'detailed'>('auto');
  const [style, setStyle] = useState<'standard' | 'minimalist' | 'detailed'>('standard');
  const [requiredPref, setRequiredPref] = useState<'smart' | 'all' | 'minimal'>('smart');

  // Preview viewport
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // Result
  const [generatedSchema, setGeneratedSchema] = useState<NormalizedAiFormSchema | null>(null);

  const [isPersisting, startPersistTransition] = useTransition();

  // Progress stepper simulation while awaiting server action
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (viewState === 'generating') {
      setActiveStepIndex(0);
      timer = setInterval(() => {
        setActiveStepIndex((prev) => {
          if (prev < GENERATION_STEPS.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 900);
    }
    return () => clearInterval(timer);
  }, [viewState]);

  // Keyboard shortcut: ⌘⏎ to generate
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (prompt.trim().length >= 3 && viewState === 'input') {
        handleGenerate();
      }
    }
  };

  const handleGenerate = async () => {
    const cleanPrompt = prompt.trim();
    if (cleanPrompt.length < 3) {
      setErrorMessage('Please describe the form you would like to generate (at least 3 characters).');
      return;
    }

    setErrorMessage(null);
    setViewState('generating');

    try {
      const options: AiGenerationOptions = {
        fieldCountPreference: fieldCount === 'auto' ? undefined : fieldCount,
        stylePreference: style,
        requiredPreference: requiredPref,
      };

      const result = await generateFormSchemaAction(cleanPrompt, options);

      if (!result.success || !result.schema) {
        setErrorMessage(result.error || "Couldn't generate the form. Try again with more details.");
        setViewState('input');
        return;
      }

      setGeneratedSchema(result.schema);
      setViewState('preview');
    } catch (err: any) {
      setErrorMessage("Couldn't generate the form. Try again.");
      setViewState('input');
    }
  };

  const handleRegenerate = () => {
    handleGenerate();
  };

  const handleEditPrompt = () => {
    setViewState('input');
  };

  const handleCreateForm = () => {
    if (!generatedSchema) return;

    startPersistTransition(async () => {
      try {
        await createFormFromAiSchema({
          title: generatedSchema.title,
          description: generatedSchema.description,
          fields: generatedSchema.fields,
        });
      } catch (err: any) {
        if (err?.message?.includes('NEXT_REDIRECT') || err?.digest?.includes('NEXT_REDIRECT')) {
          return;
        }
        setErrorMessage('Failed to create form in database. Please try again.');
      }
    });
  };

  return (
    <div className="w-full">
      {/* ========================================================================= */}
      {/* 1. INPUT STATE */}
      {/* ========================================================================= */}
      {viewState === 'input' && (
        <div className="rounded-3xl border border-black/[0.08] bg-white p-6 sm:p-8 shadow-craft space-y-7 animate-in fade-in duration-150">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.06] pb-6">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-black/[0.08] bg-white text-xs font-semibold text-[#18181B] shadow-craft-sm">
                <Wand2 className="h-3.5 w-3.5 text-[#007AFF]" />
                <span>Prompt to Blueprint</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#18181B]">
                Describe what you want to build
              </h2>
              <p className="text-xs sm:text-sm text-[#52525B] max-w-xl">
                Describe the form in natural language. FormFlow synthesizes 12-column responsive layouts, input validations, section groupings, and conditional logic.
              </p>
            </div>

            {onBackToOverview && (
              <button
                type="button"
                onClick={onBackToOverview}
                className="self-start sm:self-center inline-flex items-center gap-1.5 text-xs font-medium text-[#52525B] hover:text-[#18181B] transition-colors py-1.5 px-3 rounded-lg hover:bg-black/[0.04]"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Back to options</span>
              </button>
            )}
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/90 p-4 text-xs font-medium text-rose-800 flex items-start gap-3 animate-in fade-in duration-150">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Prompt Textarea */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="ai-form-prompt" className="block text-xs font-semibold uppercase tracking-wider text-[#71717A] font-mono">
                Prompt Description
              </label>
              <span className="text-[11px] font-mono text-[#71717A]">
                Press <kbd className="kbd-pill">⌘ Enter</kbd> to run
              </span>
            </div>
            <div className="relative rounded-2xl border border-black/[0.1] bg-[#FAFAFA] focus-within:border-[#18181B] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#18181B]/10 transition-all shadow-craft-sm">
              <textarea
                id="ai-form-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. B2B client intake form collecting company name, headcount, primary technical stack, project budget tier, and an optional NDA agreement upload."
                rows={4}
                className="w-full resize-none bg-transparent p-4 text-sm text-[#18181B] placeholder:text-[#71717A] focus:outline-none"
              />
              <div className="flex items-center justify-between px-4 pb-3 pt-1 text-[11px] text-[#71717A] border-t border-black/[0.04]">
                <span>Specify fields, sections, or business rules.</span>
                <span className="font-mono">{prompt.length}/1000</span>
              </div>
            </div>
          </div>

          {/* Curated Prompt Ideas */}
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#71717A] font-mono block">
              Curated Presets
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {EXAMPLE_PROMPTS.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => {
                    setPrompt(ex);
                    setErrorMessage(null);
                  }}
                  className="rounded-xl border border-black/[0.08] bg-[#FAFAFA] p-3 text-xs text-[#18181B] hover:bg-zinc-100 hover:border-black/[0.16] transition-all text-left shadow-craft-sm leading-relaxed"
                >
                  <span className="text-[#52525B]">&ldquo;{ex}&rdquo;</span>
                </button>
              ))}
            </div>
          </div>

          {/* Optional Lightweight Parameters */}
          <div className="rounded-2xl border border-black/[0.06] bg-[#FAFAFA] p-4 space-y-3 shadow-craft-sm">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="inline-flex items-center gap-2 text-xs font-semibold text-[#18181B] hover:text-[#007AFF] transition-colors"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Layout & Validation Controls</span>
                <span className="text-[10px] font-normal text-[#71717A]">
                  ({showAdvanced ? 'Hide' : 'Expand'})
                </span>
              </button>

              <span className="text-[11px] font-mono text-[#71717A]">Auto-balanced grid</span>
            </div>

            {showAdvanced && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-black/[0.06] animate-in fade-in duration-150">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#18181B]">Field density</label>
                  <select
                    value={fieldCount}
                    onChange={(e) => setFieldCount(e.target.value as any)}
                    className="h-8 w-full rounded-lg border border-black/[0.1] bg-white px-2.5 text-xs text-[#18181B] focus:outline-none"
                  >
                    <option value="auto">Auto (Balanced)</option>
                    <option value="compact">Compact (5–8 fields)</option>
                    <option value="standard">Standard (9–15 fields)</option>
                    <option value="detailed">Comprehensive (16+ fields)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#18181B]">Section layout</label>
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value as any)}
                    className="h-8 w-full rounded-lg border border-black/[0.1] bg-white px-2.5 text-xs text-[#18181B] focus:outline-none"
                  >
                    <option value="standard">Standard Grouping</option>
                    <option value="minimalist">Single Block</option>
                    <option value="detailed">Section Dividers</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#18181B]">Validation enforcement</label>
                  <select
                    value={requiredPref}
                    onChange={(e) => setRequiredPref(e.target.value as any)}
                    className="h-8 w-full rounded-lg border border-black/[0.1] bg-white px-2.5 text-xs text-[#18181B] focus:outline-none"
                  >
                    <option value="smart">Smart Defaults</option>
                    <option value="all">Strict (All Required)</option>
                    <option value="minimal">Relaxed</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Action button */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleGenerate()}
              disabled={prompt.trim().length === 0}
              className="flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-[#18181B] text-xs font-semibold text-white shadow-craft-lg hover:bg-black transition-all btn-press disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Wand2 className="h-4 w-4" />
              <span>Generate Blueprint</span>
              <kbd className="hidden sm:inline font-mono text-[10px] bg-white/20 px-1 py-0.5 rounded text-white/90 ml-1">⌘⏎</kbd>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. GENERATING STATE */}
      {/* ========================================================================= */}
      {viewState === 'generating' && (
        <div className="rounded-3xl border border-black/[0.08] bg-white p-12 shadow-craft flex flex-col items-center justify-center text-center space-y-7 animate-in fade-in duration-200">
          <div className="relative">
            <div className="h-14 w-14 rounded-2xl bg-[#FAFAFA] border border-black/[0.1] flex items-center justify-center text-[#18181B] shadow-craft-sm">
              <Loader2 className="h-6 w-6 animate-spin text-[#007AFF]" />
            </div>
          </div>

          <div className="space-y-1.5 max-w-md">
            <h3 className="text-base font-bold text-[#18181B]">Synthesizing layout structure...</h3>
            <p className="text-xs text-[#52525B]">
              Analyzing requirements, computing 12-column spans, and setting validation boundaries.
            </p>
          </div>

          {/* Progression steps */}
          <div className="w-full max-w-sm rounded-2xl border border-black/[0.06] bg-[#FAFAFA] p-4 space-y-2.5 text-left shadow-craft-sm">
            {GENERATION_STEPS.map((step, idx) => {
              const isPast = idx < activeStepIndex;
              const isCurrent = idx === activeStepIndex;

              return (
                <div key={step} className="flex items-center gap-2.5 text-xs transition-colors">
                  <div className="shrink-0">
                    {isPast ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : isCurrent ? (
                      <div className="h-4 w-4 rounded-full border-2 border-[#007AFF] border-t-transparent animate-spin" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-black/[0.15] bg-white" />
                    )}
                  </div>
                  <span
                    className={`font-medium ${
                      isCurrent
                        ? 'text-[#18181B]'
                        : isPast
                        ? 'text-[#71717A]'
                        : 'text-[#71717A]/50'
                    }`}
                  >
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. PREVIEW STATE (READ-ONLY) */}
      {/* ========================================================================= */}
      {viewState === 'preview' && generatedSchema && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-black/[0.08] bg-white p-5 sm:p-6 shadow-craft">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-[11px] font-semibold">
                  <FileCheck2 className="h-3 w-3 text-emerald-600" />
                  <span>Blueprint Ready</span>
                </span>
                <span className="text-[11px] font-mono text-[#52525B] bg-[#FAFAFA] border border-black/[0.06] px-2 py-0.5 rounded-md">
                  {generatedSchema.fields.length} inputs
                </span>
                <span className="text-[11px] font-mono text-[#52525B] bg-[#FAFAFA] border border-black/[0.06] px-2 py-0.5 rounded-md">
                  12-column grid
                </span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-[#18181B] truncate">
                {generatedSchema.title}
              </h2>
              {generatedSchema.description && (
                <p className="text-xs text-[#52525B] max-w-2xl line-clamp-2">
                  {generatedSchema.description}
                </p>
              )}
            </div>

            {/* Actions: Viewport toggle + Create form */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {/* Viewport switcher */}
              <div className="flex items-center bg-[#FAFAFA] rounded-lg p-0.5 border border-black/[0.08]">
                <button
                  type="button"
                  onClick={() => setPreviewViewport('desktop')}
                  className={`p-1.5 rounded text-xs transition-all ${
                    previewViewport === 'desktop' ? 'bg-[#18181B] text-white shadow-2xs' : 'text-[#71717A]'
                  }`}
                  title="Desktop (100%)"
                >
                  <Laptop className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewViewport('tablet')}
                  className={`p-1.5 rounded text-xs transition-all ${
                    previewViewport === 'tablet' ? 'bg-[#18181B] text-white shadow-2xs' : 'text-[#71717A]'
                  }`}
                  title="Tablet"
                >
                  <Tablet className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewViewport('mobile')}
                  className={`p-1.5 rounded text-xs transition-all ${
                    previewViewport === 'mobile' ? 'bg-[#18181B] text-white shadow-2xs' : 'text-[#71717A]'
                  }`}
                  title="Mobile"
                >
                  <Smartphone className="h-3.5 w-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleEditPrompt}
                disabled={isPersisting}
                className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-black/[0.1] bg-white text-xs font-medium text-[#18181B] hover:bg-zinc-50 transition-colors disabled:opacity-50 shadow-craft-sm"
              >
                <Edit3 className="h-3.5 w-3.5 text-[#71717A]" />
                <span>Adjust</span>
              </button>

              <button
                type="button"
                onClick={handleRegenerate}
                disabled={isPersisting}
                className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-black/[0.1] bg-white text-xs font-medium text-[#18181B] hover:bg-zinc-50 transition-colors disabled:opacity-50 shadow-craft-sm"
              >
                <RotateCcw className="h-3.5 w-3.5 text-[#71717A]" />
                <span>Rerun</span>
              </button>

              <button
                type="button"
                onClick={handleCreateForm}
                disabled={isPersisting}
                className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#18181B] text-xs font-semibold text-white shadow-craft hover:bg-black transition-colors disabled:opacity-60 btn-press"
              >
                {isPersisting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Opening Canvas...</span>
                  </>
                ) : (
                  <>
                    <span>Open in Studio</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Form Canvas Preview with responsive container */}
          <div className="rounded-3xl border border-black/[0.08] bg-[#FAFAFA] bg-dot-pattern p-4 sm:p-8">
            <div
              className={`mx-auto transition-all duration-200 ${
                previewViewport === 'desktop'
                  ? 'max-w-2xl'
                  : previewViewport === 'tablet'
                  ? 'max-w-[480px]'
                  : 'max-w-[340px]'
              }`}
            >
              <div className="rounded-2xl border border-black/[0.08] bg-white p-6 sm:p-8 shadow-craft space-y-6">
                <div className="border-b border-black/[0.06] pb-4">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#18181B]">
                    {generatedSchema.title}
                  </h1>
                  {generatedSchema.description && (
                    <p className="text-xs text-[#52525B] mt-1 leading-relaxed">
                      {generatedSchema.description}
                    </p>
                  )}
                </div>

                {/* 12-Column Grid */}
                <div className={`grid gap-x-4 gap-y-4 ${previewViewport === 'mobile' ? 'grid-cols-1' : 'grid-cols-12'}`}>
                  {generatedSchema.fields.map((field) => {
                    const widthClass = previewViewport === 'mobile' ? 'col-span-1' : getFieldWidthClass(field.width);
                    const isConditional = Boolean(field.visibleIf);

                    const conditionalBadge = isConditional ? (
                      <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                        <GitBranch className="h-2.5 w-2.5 text-emerald-600 shrink-0" />
                        <span>Conditional logic</span>
                      </span>
                    ) : null;

                    return (
                      <div key={field.id} className={widthClass}>
                        <FieldRenderer
                          field={field}
                          value={undefined}
                          onChange={() => {}}
                          disabled
                          labelExtra={conditionalBadge}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
