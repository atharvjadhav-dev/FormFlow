import React from 'react';
import {
  Layout,
  GitBranch,
  History,
  Globe2,
  Wand2,
  Boxes,
} from 'lucide-react';

const FEATURES = [
  {
    title: 'Visual 12-Column Grid',
    description: 'Structure forms with predictable multi-column layouts that gracefully stack on mobile devices without broken alignments.',
    tag: 'Grid Engine',
    visual: (
      <div className="rounded-xl bg-[#FAFAFA] border border-black/[0.06] p-3 space-y-1.5 font-mono text-[10px]">
        <div className="grid grid-cols-12 gap-1 text-center">
          <div className="col-span-6 bg-white rounded border border-black/[0.08] py-1 text-[#007AFF] font-semibold shadow-craft-sm">col-6</div>
          <div className="col-span-6 bg-white rounded border border-black/[0.08] py-1 text-[#007AFF] font-semibold shadow-craft-sm">col-6</div>
        </div>
        <div className="grid grid-cols-12 gap-1 text-center">
          <div className="col-span-4 bg-white rounded border border-black/[0.08] py-1 text-[#18181B] shadow-craft-sm">col-4</div>
          <div className="col-span-4 bg-white rounded border border-black/[0.08] py-1 text-[#18181B] shadow-craft-sm">col-4</div>
          <div className="col-span-4 bg-white rounded border border-black/[0.08] py-1 text-[#18181B] shadow-craft-sm">col-4</div>
        </div>
      </div>
    ),
  },
  {
    title: 'Intelligent Schema Synthesis',
    description: 'Draft complex forms in seconds. Pre-computes responsive spans, input validations, and section groupings from intent.',
    tag: 'Generation',
    visual: (
      <div className="rounded-xl bg-[#FAFAFA] border border-black/[0.06] p-3 space-y-2 text-[11px]">
        <div className="flex items-center justify-between text-[#18181B] font-medium">
          <div className="flex items-center gap-1.5">
            <Wand2 className="h-3 w-3 text-[#007AFF]" />
            <span className="font-mono text-[11px]">&ldquo;Job application with resume upload&rdquo;</span>
          </div>
          <span className="kbd-pill">12-COL</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-[#52525B] font-mono">
          <span>14 inputs · 4 sections · typed validation rules</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Conditional Branching',
    description: 'Show or hide fields dynamically based on applicant responses using multi-condition rules with AND / OR combinators.',
    tag: 'Logic Rules',
    visual: (
      <div className="rounded-xl bg-[#FAFAFA] border border-black/[0.06] p-3 space-y-1.5 text-[11px] font-mono text-[#18181B]">
        <div className="flex items-center justify-between text-[#52525B]">
          <div className="flex items-center gap-1.5 font-medium">
            <GitBranch className="h-3 w-3 text-[#007AFF]" />
            <span>Rule: visibleIf</span>
          </div>
          <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">ACTIVE</span>
        </div>
        <p className="text-[10px] text-[#52525B]">
          Employment == &ldquo;Full-time&rdquo; <span className="text-[#007AFF]">→</span> Reveal Benefits Package
        </p>
      </div>
    ),
  },
  {
    title: 'Pre-Engineered Templates',
    description: 'Start from 12 vetted templates spanning admissions, onboarding, feedback, and enterprise compliance with instant customization.',
    tag: 'Templates',
    visual: (
      <div className="grid grid-cols-2 gap-1.5 text-[11px] font-medium text-[#18181B]">
        <div className="bg-white rounded-lg p-2 border border-black/[0.06] shadow-craft-sm truncate flex items-center gap-1.5">
          <span>🎓</span> <span>College Admissions</span>
        </div>
        <div className="bg-white rounded-lg p-2 border border-black/[0.06] shadow-craft-sm truncate flex items-center gap-1.5">
          <span>💼</span> <span>Candidate Intake</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Snapshots & Rollbacks',
    description: 'Every draft iteration and public release is cleanly version-controlled. Compare past configurations and safely restore previous snapshots.',
    tag: 'Versioning',
    visual: (
      <div className="rounded-xl bg-[#FAFAFA] border border-black/[0.06] p-3 space-y-1.5 font-mono text-[10px] text-[#18181B]">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-emerald-700 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            v2.1 (Live Production)
          </span>
          <span className="text-[#71717A]">14 fields</span>
        </div>
        <div className="flex items-center justify-between text-[#71717A]">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
            v2.0 (Archived Draft)
          </span>
          <span>12 fields</span>
        </div>
      </div>
    ),
  },
  {
    title: 'High-Performance Edge Endpoints',
    description: 'Publish live forms in a single click. Every published version is pinned, immutable, and served with minimal latency.',
    tag: 'Distribution',
    visual: (
      <div className="rounded-xl bg-[#FAFAFA] border border-black/[0.06] p-3 flex items-center justify-between text-xs text-[#18181B]">
        <div className="flex items-center gap-2">
          <Globe2 className="h-3.5 w-3.5 text-[#007AFF]" />
          <span className="font-mono text-[11px] text-[#52525B]">/f/onboarding-2026</span>
        </div>
        <span className="kbd-pill text-emerald-700 bg-emerald-50 border-emerald-200">200 OK</span>
      </div>
    ),
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="scroll-mt-20 max-w-6xl mx-auto px-4 sm:px-6 py-24 border-t border-black/[0.06]">
      {/* Eyebrow & Headline */}
      <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-3 py-1 text-xs font-semibold text-[#18181B] shadow-craft-sm">
          <span>Engineered for Production</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#18181B] leading-tight">
          Everything you need to ship great forms.
        </h2>
        <p className="text-sm sm:text-base text-[#52525B] leading-relaxed">
          From first draft to public distribution, FormFlow handles the entire lifecycle with zero boilerplate.
        </p>
      </div>

      {/* 6 Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="rounded-2xl border border-black/[0.08] bg-white p-6 shadow-craft flex flex-col justify-between space-y-5 shadow-craft-hover"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A]">
                  {feature.tag}
                </span>
              </div>
              <h3 className="text-base font-semibold text-[#18181B]">{feature.title}</h3>
              <p className="text-xs text-[#52525B] leading-relaxed">
                {feature.description}
              </p>
            </div>

            <div className="pt-2">{feature.visual}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
