'use client';

import React, { useState } from 'react';
import { GitBranch, ArrowDown, Check, EyeOff, Sparkles } from 'lucide-react';

export function ConditionalLogicSection() {
  const [selectedType, setSelectedType] = useState<'Full-time' | 'Contractor' | 'Intern'>('Full-time');

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-24 border-t border-black/[0.06]">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Explanation */}
        <div className="lg:col-span-5 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white px-3 py-1 text-xs font-semibold text-[#18181B] shadow-craft-sm">
            <GitBranch className="h-3.5 w-3.5 text-[#007AFF]" />
            <span>Conditional Branching</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#18181B] leading-tight">
            Ask only what matters. <br />
            Hide the rest.
          </h2>
          <p className="text-sm sm:text-base text-[#52525B] leading-relaxed">
            Eliminate cognitive clutter with smart branching rules. Build logic using multi-condition <code className="text-xs font-mono font-semibold bg-black/[0.04] px-1.5 py-0.5 rounded">AND</code> / <code className="text-xs font-mono font-semibold bg-black/[0.04] px-1.5 py-0.5 rounded">OR</code> combinators with strict circular dependency protection.
          </p>

          <div className="pt-2 text-xs text-[#52525B] space-y-2">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Reveals questions only when precise triggers match</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Validates topological order to prevent dead-ends</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Evaluated identically in builder canvas and edge runtime</span>
            </div>
          </div>
        </div>

        {/* Right Visual Rule Builder & Live Interactive Preview */}
        <div className="lg:col-span-7 rounded-3xl border border-black/[0.08] bg-[#FAFAFA] p-6 sm:p-8 space-y-5 shadow-craft">
          {/* Step 1: Trigger Field */}
          <div className="rounded-2xl border border-black/[0.08] bg-white p-5 shadow-craft space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A]">
                1. Trigger Field (Input)
              </span>
              <span className="kbd-pill">DROPDOWN</span>
            </div>
            <label className="text-xs font-semibold text-[#18181B]">Position Type</label>
            <div className="flex flex-wrap gap-2 pt-1">
              {(['Full-time', 'Contractor', 'Intern'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(type)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedType === type
                      ? 'bg-[#18181B] text-white shadow-craft-sm font-semibold'
                      : 'border border-black/[0.08] bg-[#FAFAFA] text-[#52525B] hover:bg-zinc-100'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Visual Rule Connection Badge */}
          <div className="flex flex-col items-center justify-center space-y-1.5 py-1">
            <ArrowDown className="h-4 w-4 text-[#71717A]" />
            <div className="inline-flex items-center gap-2 rounded-lg border border-black/[0.08] bg-white px-3 py-1.5 text-xs font-mono text-[#18181B] shadow-craft-sm">
              <span className="font-semibold text-[#007AFF]">visibleIf:</span>
              <span className="text-[#52525B]">Position Type</span>
              <span className="font-semibold text-emerald-600">==</span>
              <span className="font-bold text-[#18181B]">&ldquo;Full-time&rdquo;</span>
            </div>
            <ArrowDown className="h-4 w-4 text-[#71717A]" />
          </div>

          {/* Step 2: Dependent Target Field */}
          <div className="rounded-2xl border border-black/[0.08] bg-white p-5 shadow-craft space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A]">
                2. Target Field (Reactive)
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                  selectedType === 'Full-time'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                    : 'bg-zinc-100 text-[#71717A]'
                }`}
              >
                {selectedType === 'Full-time' ? '● Visible on Form' : '○ Hidden from Form'}
              </span>
            </div>

            {selectedType === 'Full-time' ? (
              <div className="space-y-2 transition-all">
                <label className="text-xs font-semibold text-[#18181B]">
                  Benefits & Retirement Election <span className="text-[#007AFF]">*</span>
                </label>
                <div className="h-10 w-full rounded-xl border border-emerald-200 bg-emerald-50/40 px-3 flex items-center justify-between text-xs text-[#18181B]">
                  <span className="font-medium">Comprehensive Health, Dental & 401(k) Match</span>
                  <Check className="h-4 w-4 text-emerald-600" />
                </div>
                <p className="text-[11px] text-[#71717A]">
                  Condition satisfied: Applicant selected Full-time employment.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-black/[0.1] bg-[#FAFAFA] p-4 text-center space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-xs text-[#71717A]">
                  <EyeOff className="h-3.5 w-3.5" />
                  <span>Field currently dormant</span>
                </div>
                <p className="text-[11px] text-[#71717A]">
                  Switch Position Type to &ldquo;Full-time&rdquo; to test dynamic reveal.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
