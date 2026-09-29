'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import type { FormTemplate, TemplateCategory } from '@/lib/templates';
import { ArrowRight, Layers, Sparkles } from 'lucide-react';

interface TemplatesShowcaseProps {
  templates: FormTemplate[];
  isAuthenticated: boolean;
}

const CATEGORIES: ('All' | TemplateCategory)[] = [
  'All',
  'General',
  'Business',
  'Events',
  'Education',
  'Other',
];

export function TemplatesShowcase({ templates, isAuthenticated }: TemplatesShowcaseProps) {
  const [selectedCategory, setSelectedCategory] = useState<'All' | TemplateCategory>('All');

  const filteredTemplates = useMemo(() => {
    if (selectedCategory === 'All') return templates;
    return templates.filter((t) => t.category.toLowerCase() === selectedCategory.toLowerCase());
  }, [templates, selectedCategory]);

  const targetHref = isAuthenticated ? '/dashboard/forms/new' : '/sign-up?redirect_url=/dashboard/forms/new';

  return (
    <section id="templates" className="scroll-mt-20 max-w-6xl mx-auto px-4 sm:px-6 py-20 border-t border-black/[0.06]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div className="space-y-3 max-w-xl">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-black/[0.02] px-3 py-0.5 text-xs font-semibold text-[#86868B] uppercase tracking-wider">
            <Layers className="h-3.5 w-3.5 text-[#007AFF]" />
            <span>Ready-Made Templates</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1D1D1F]">
            Start from proven structures.
          </h2>
          <p className="text-sm sm:text-base text-[#86868B] leading-relaxed">
            Jumpstart your forms with 12 professionally engineered templates featuring ready-made layouts, field validation, and conditional branches.
          </p>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`h-8 px-3.5 rounded-full text-xs font-medium transition-all shrink-0 ${
                  isSelected
                    ? 'bg-[#1D1D1F] text-white shadow-xs font-semibold'
                    : 'border border-black/[0.08] bg-white text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/[0.03]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Template Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTemplates.map((template) => (
          <Link
            key={template.id}
            href={targetHref}
            className="group rounded-2xl border border-black/[0.08] bg-white p-5 shadow-xs transition-all hover:border-black/[0.2] hover:shadow-md flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <span className="text-2xl select-none group-hover:scale-110 transition-transform">
                  {template.icon}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-[#86868B] bg-black/[0.04] px-2 py-0.5 rounded-full">
                    {template.category}
                  </span>
                  <span className="text-[10px] font-semibold text-[#007AFF] bg-[#007AFF]/10 px-2 py-0.5 rounded-full">
                    {template.fields.length} fields
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-base font-semibold text-[#1D1D1F] group-hover:text-[#007AFF] transition-colors">
                  {template.name}
                </h3>
                <p className="text-xs text-[#86868B] mt-1 line-clamp-2 leading-relaxed">
                  {template.description}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-black/[0.04] flex items-center justify-between text-xs font-semibold text-[#1D1D1F] group-hover:text-[#007AFF]">
              <span>Customize template</span>
              <ArrowRight className="h-3.5 w-3.5 transform group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
