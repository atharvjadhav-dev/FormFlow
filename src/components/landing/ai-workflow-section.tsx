import React from 'react';
import Link from 'next/link';
import {
  Wand2,
  ArrowRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
  SlidersHorizontal,
  LayoutGrid,
} from 'lucide-react';

interface AiWorkflowSectionProps {
  isAuthenticated: boolean;
}

export function AiWorkflowSection({ isAuthenticated }: AiWorkflowSectionProps) {
  const aiHref = isAuthenticated ? '/dashboard/forms/new?mode=ai' : '/sign-up?redirect_url=/dashboard/forms/new?mode=ai';

  return (
    <section id="ai" className="scroll-mt-20 max-w-6xl mx-auto px-4 sm:px-6 py-24 border-t border-black/[0.06]">
      {/* Eyebrow & Headline */}
      <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white px-3 py-1 text-xs font-semibold text-[#18181B] shadow-craft-sm">
          <Wand2 className="h-3.5 w-3.5 text-[#007AFF]" />
          <span>Prompt to Form</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#18181B] leading-tight">
          Describe the intent. <br />
          Get an engineered layout.
        </h2>
        <p className="text-sm sm:text-base text-[#52525B] leading-relaxed">
          Skip dragging 30 individual fields. FormFlow synthesizes complete, responsive 12-column layouts with typed validation, section groupings, and conditional branches.
        </p>
      </div>

      {/* Visual Workflow Pipeline Graphic */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-stretch relative">
        {/* Step 1: User Prompt */}
        <div className="rounded-2xl border border-black/[0.08] bg-white p-5 shadow-craft flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A]">
                01 · Plain English
              </span>
              <span className="kbd-pill">PROMPT</span>
            </div>
            <div className="rounded-xl border border-black/[0.06] bg-[#FAFAFA] p-3 text-xs text-[#18181B] font-mono leading-relaxed">
              &ldquo;Scholarship application collecting academic standing, income tiers, and uploaded PDF transcripts.&rdquo;
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#52525B]">
            <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span>Understands business context</span>
          </div>
        </div>

        {/* Step 2: Synthesis Engine */}
        <div className="rounded-2xl border border-blue-500/20 bg-blue-50/20 p-5 shadow-craft flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#007AFF]">
                02 · Structure Engine
              </span>
              <span className="kbd-pill text-[#007AFF] bg-blue-50/80 border-blue-200">SCHEMA</span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-[#18181B] font-semibold">
                <LayoutGrid className="h-3.5 w-3.5 text-[#007AFF]" />
                <span>Responsive Grid Mapping</span>
              </div>
              <p className="text-[11px] text-[#52525B] leading-relaxed">
                Calculates optimal 6+6 and 4+4+4 spans, attaches typed validation rules, and defines conditional triggers.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#007AFF] font-medium">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            <span>Strict schema validation</span>
          </div>
        </div>

        {/* Step 3: Structured Schema */}
        <div className="rounded-2xl border border-black/[0.08] bg-white p-5 shadow-craft flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A]">
                03 · Form Blueprint
              </span>
              <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-md border border-emerald-200/70">
                18 fields
              </span>
            </div>
            <ul className="space-y-1.5 text-xs text-[#18181B]">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Personal & Contact Info (6/6)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Academic Record & GPA (4/4/4)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Conditional Income Fields</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>PDF Transcript Upload Box</span>
              </li>
            </ul>
          </div>
          <span className="text-[11px] text-[#71717A] font-mono">12-column responsive layout</span>
        </div>

        {/* Step 4: Preview & One-Click Creation */}
        <div className="rounded-2xl border border-black/[0.12] bg-[#18181B] text-white p-5 shadow-craft flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                04 · Studio Canvas
              </span>
              <span className="text-[10px] font-mono bg-white/10 text-zinc-300 font-semibold px-1.5 py-0.5 rounded">
                LIVE
              </span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Review on the visual canvas. Tweak layout spans or re-prompt specific sections before committing to production.
            </p>
          </div>
          <Link
            href={aiHref}
            className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-white text-xs font-semibold text-[#18181B] hover:bg-zinc-100 transition-colors shadow-xs active:scale-[0.98]"
          >
            <span>Launch with AI</span>
            <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
