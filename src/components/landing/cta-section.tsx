'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';

interface CtaSectionProps {
  isAuthenticated: boolean;
}

export function CtaSection({ isAuthenticated }: CtaSectionProps) {
  const startBuildingHref = isAuthenticated ? '/dashboard/forms/new' : '/sign-up';
  const aiHref = isAuthenticated ? '/dashboard/forms/new?mode=ai' : '/sign-up?redirect_url=/dashboard/forms/new?mode=ai';

  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 py-20 text-center">
      <div className="rounded-3xl border border-black/[0.08] bg-linear-to-b from-[#FBFBFC] to-[#F5F5F7] p-8 sm:p-14 shadow-xs space-y-6">
        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#1D1D1F]">
          Build your next form in minutes.
        </h2>
        <p className="text-sm sm:text-base text-[#86868B] max-w-lg mx-auto leading-relaxed">
          Start from scratch, use a template, or let AI create the first draft.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href={startBuildingHref}
            className="flex h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[#1D1D1F] px-6 text-sm font-semibold text-white shadow-xs hover:bg-black transition-colors"
          >
            <span>Start Building</span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href={aiHref}
            className="flex h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-blue-500/25 bg-blue-50/50 px-5 text-sm font-semibold text-[#007AFF] hover:bg-blue-100/60 transition-colors shadow-2xs"
          >
            <Sparkles className="h-4 w-4 text-[#007AFF]" />
            <span>Create with AI</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
