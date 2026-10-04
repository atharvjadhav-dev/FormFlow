'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { FormTemplate } from '@/lib/templates';
import { TemplateGallery } from '@/components/templates/template-gallery';
import { AiFormGenerator } from '@/components/ai/ai-form-generator';
import { createForm } from '@/app/dashboard/forms/actions';
import { ChevronLeft, Plus, Sparkles, LayoutTemplate, ArrowRight } from 'lucide-react';

interface NewFormClientProps {
  templates: FormTemplate[];
  initialMode?: 'overview' | 'ai';
}

export function NewFormClient({ templates, initialMode = 'overview' }: NewFormClientProps) {
  const [activeView, setActiveView] = useState<'overview' | 'ai'>(initialMode);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 space-y-10">
      {/* Top Navigation */}
      <div>
        <Link
          href="/dashboard/forms"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#86868B] hover:text-[#1D1D1F] transition-colors mb-3"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Back to forms</span>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1D1D1F]">Create a form</h1>
            <p className="text-sm text-[#86868B] mt-0.5">
              Start with an empty canvas, describe what you need with AI, or pick from ready-made templates.
            </p>
          </div>

          {activeView === 'ai' && (
            <button
              type="button"
              onClick={() => setActiveView('overview')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#86868B] hover:text-[#1D1D1F] transition-colors"
            >
              <span>Back to standard options</span>
            </button>
          )}
        </div>
      </div>

      {/* When in AI Generation Mode */}
      {activeView === 'ai' ? (
        <AiFormGenerator onBackToOverview={() => setActiveView('overview')} />
      ) : (
        /* Overview Mode: Blank Form + Create with AI + Templates */
        <div className="space-y-10 animate-in fade-in duration-200">
          {/* Top Options: Start from scratch & Create with AI side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Option 1: Start from scratch */}
            <div className="rounded-3xl border border-black/[0.08] bg-white p-6 shadow-apple flex flex-col justify-between gap-6 transition-all hover:border-black/[0.16]">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-2xl bg-black/[0.04] border border-black/[0.06] flex items-center justify-center text-[#1D1D1F] shrink-0">
                  <Plus className="h-6 w-6 stroke-2" />
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-semibold text-[#1D1D1F]">Start from scratch</h2>
                    <span className="text-[10px] font-medium text-[#86868B] bg-black/[0.04] px-2 py-0.5 rounded-full">
                      Blank canvas
                    </span>
                  </div>
                  <p className="text-xs text-[#86868B] leading-relaxed">
                    Build your form from zero. Add fields from the palette, customize 12-column layouts, and configure conditional visibility.
                  </p>
                </div>
              </div>

              <form action={createForm} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-3 border-t border-black/[0.06]">
                <input
                  id="new-form-name-input"
                  name="name"
                  aria-label="Form title"
                  placeholder="Form title (optional)"
                  className="h-10 flex-1 rounded-xl border border-black/[0.08] bg-[#F5F5F7]/80 px-3.5 text-xs text-[#1D1D1F] placeholder:text-[#86868B] transition-all hover:border-black/[0.14] focus:border-[#007AFF] focus:bg-white focus:outline-none"
                />
                <button
                  type="submit"
                  className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#1D1D1F] px-4 text-xs font-semibold text-white shadow-xs hover:bg-black transition-colors shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create blank</span>
                </button>
              </form>
            </div>

            {/* Option 2: Create with AI */}
            <div
              onClick={() => setActiveView('ai')}
              className="group cursor-pointer rounded-3xl border border-black/[0.08] bg-white p-6 shadow-apple flex flex-col justify-between gap-6 transition-all hover:border-[#007AFF]"
            >
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-2xl bg-[#007AFF]/10 border border-[#007AFF]/20 flex items-center justify-center text-[#007AFF] shrink-0 group-hover:scale-105 transition-transform">
                  <Sparkles className="h-6 w-6 stroke-2" />
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-semibold text-[#1D1D1F]">Create with AI</h2>
                    <span className="text-[10px] font-semibold text-[#007AFF] bg-[#007AFF]/10 px-2 py-0.5 rounded-full border border-[#007AFF]/20">
                      Gemini Powered
                    </span>
                  </div>
                  <p className="text-xs text-[#86868B] leading-relaxed">
                    Describe what you need in plain English. The AI generates sections, validation, field types, and conditional logic.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-black/[0.06]">
                <span className="text-xs font-medium text-[#86868B] group-hover:text-[#1D1D1F] transition-colors truncate">
                  Try &ldquo;Customer feedback form&rdquo;...
                </span>
                <button
                  type="button"
                  className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#007AFF] px-4 text-xs font-semibold text-white shadow-xs group-hover:bg-[#0071E3] transition-colors shrink-0"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Describe your form</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Templates Section */}
          <div className="space-y-6 pt-6 border-t border-black/[0.06]">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-[#1D1D1F]">Templates</h2>
                <span className="text-xs font-medium text-[#86868B] bg-black/[0.04] px-2 py-0.5 rounded-full">
                  {templates.length} ready-made
                </span>
              </div>
              <p className="text-xs text-[#86868B] mt-0.5">
                Pre-built forms with structured layouts and conditional rules. Select any template to immediately customize.
              </p>
            </div>

            <TemplateGallery templates={templates} />
          </div>
        </div>
      )}
    </div>
  );
}
