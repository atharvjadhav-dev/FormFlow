'use client';

import React, { useState, useMemo, useTransition } from 'react';
import type { FormTemplate, TemplateCategory } from '@/lib/templates';
import { TemplatePreviewModal } from './template-preview-modal';
import { createFormFromTemplate } from '@/app/dashboard/forms/actions';
import { Search, X, Eye, ArrowRight, Layers, Loader2 } from 'lucide-react';

interface TemplateGalleryProps {
  templates: FormTemplate[];
}

const CATEGORIES: ('All' | TemplateCategory)[] = [
  'All',
  'General',
  'Business',
  'Events',
  'Education',
  'Other',
];

export function TemplateGallery({ templates }: TemplateGalleryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | TemplateCategory>('All');
  const [previewTemplate, setPreviewTemplate] = useState<FormTemplate | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);

  const handleUseTemplate = (templateId: string) => {
    setPendingTemplateId(templateId);
    startTransition(async () => {
      await createFormFromTemplate(templateId);
    });
  };

  const filteredTemplates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return templates.filter((t) => {
      const matchesCategory =
        selectedCategory === 'All' || t.category.toLowerCase() === selectedCategory.toLowerCase();
      if (!matchesCategory) return false;

      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.fields.some((f) => f.label.toLowerCase().includes(q))
      );
    });
  }, [templates, searchQuery, selectedCategory]);

  return (
    <div className="space-y-6">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {CATEGORIES.map((category) => {
            const isSelected = selectedCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`h-8 px-3.5 rounded-full text-xs font-medium transition-all shrink-0 ${
                  isSelected
                    ? 'bg-[#1D1D1F] text-white shadow-2xs'
                    : 'bg-black/[0.04] text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/[0.07]'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#86868B]" />
          <input
            id="search-templates-input"
            name="searchTemplates"
            aria-label="Search templates"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="h-9 w-full rounded-xl border border-black/[0.08] bg-white pl-9 pr-8 text-xs text-[#1D1D1F] placeholder:text-[#86868B] transition-all hover:border-black/[0.14] focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 p-0.5 text-[#86868B] hover:text-[#1D1D1F]"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Template Count Header */}
      <div className="flex items-center justify-between text-xs text-[#86868B]">
        <span>
          Showing {filteredTemplates.length}{' '}
          {filteredTemplates.length === 1 ? 'template' : 'templates'}
        </span>
        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All');
            }}
            className="text-[#007AFF] hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <div className="rounded-2xl border border-dashed border-black/[0.12] bg-white p-12 text-center space-y-3">
          <Layers className="h-8 w-8 text-[#86868B] mx-auto opacity-50" />
          <h4 className="text-sm font-semibold text-[#1D1D1F]">No templates found</h4>
          <p className="text-xs text-[#86868B] max-w-sm mx-auto">
            No templates match &ldquo;{searchQuery}&rdquo;. Try another keyword or browse all categories.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All');
            }}
            className="h-8 px-4 rounded-lg bg-black/[0.05] text-xs font-medium text-[#1D1D1F] hover:bg-black/[0.09] transition-colors"
          >
            Show all templates
          </button>
        </div>
      )}

      {/* Grid of Templates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => {
          const isCurrentPending = isPending && pendingTemplateId === template.id;

          return (
            <div
              key={template.id}
              className="group rounded-2xl border border-black/[0.06] bg-white p-5 shadow-2xs hover:border-black/[0.14] hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-2xl select-none">{template.icon}</span>
                  <span className="rounded-full bg-black/[0.04] px-2 py-0.5 text-[10px] font-medium text-[#86868B]">
                    {template.category}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-[#1D1D1F] group-hover:text-[#007AFF] transition-colors">
                    {template.name}
                  </h3>
                  <p className="text-xs text-[#86868B] line-clamp-2 mt-1 leading-relaxed">
                    {template.description}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-[#86868B]">
                  <span className="font-mono text-black/[0.3]">•</span>
                  <span>{template.fields.length} pre-configured fields</span>
                </div>
              </div>

              {/* Card Actions */}
              <div className="mt-5 pt-3.5 border-t border-black/[0.05] flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewTemplate(template)}
                  disabled={isPending}
                  className="flex-1 h-8 rounded-lg border border-black/[0.08] bg-white text-xs font-medium text-[#1D1D1F] hover:bg-black/[0.03] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Eye className="h-3.5 w-3.5 text-[#86868B]" />
                  <span>Preview</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleUseTemplate(template.id)}
                  disabled={isPending}
                  className="flex-1 h-8 rounded-lg bg-[#007AFF] text-xs font-semibold text-white shadow-2xs hover:bg-[#0071E3] transition-colors flex items-center justify-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isCurrentPending ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <span>Use template</span>
                      <ArrowRight className="h-3 w-3" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Read-only Preview Modal */}
      {previewTemplate && (
        <TemplatePreviewModal
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onUseTemplate={(id) => handleUseTemplate(id)}
          isCreating={isPending && pendingTemplateId === previewTemplate.id}
        />
      )}
    </div>
  );
}

