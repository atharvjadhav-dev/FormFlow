import React from 'react';
import Link from 'next/link';
import { ArrowRight, Wand2, Terminal } from 'lucide-react';

interface HeroProps {
  isAuthenticated: boolean;
}

export function Hero({ isAuthenticated }: HeroProps) {
  const startBuildingHref = isAuthenticated ? '/dashboard/forms/new' : '/sign-up';
  const aiHref = isAuthenticated ? '/dashboard/forms/new?mode=ai' : '/sign-up?redirect_url=/dashboard/forms/new?mode=ai';

  return (
    <section className="relative px-4 sm:px-6 pt-20 sm:pt-28 pb-14 sm:pb-20 text-center max-w-4xl mx-auto">
      {/* Eyebrow */}
      <div className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white px-3.5 py-1.5 text-xs font-medium text-[#18181B] mb-8 shadow-craft">
        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#52525B]">Engineered for Conversion</span>
        <span className="text-zinc-300">|</span>
        <span className="text-xs text-[#18181B] font-medium">12-Column Responsive Layouts</span>
      </div>

      {/* Main Headline */}
      <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-[-0.03em] text-[#18181B] leading-[1.06] max-w-3xl mx-auto">
        Build forms that feel <br className="hidden sm:inline" />
        <span className="text-[#18181B] bg-clip-text">designed, not configured.</span>
      </h1>

      {/* Supporting Text */}
      <p className="mt-6 text-base sm:text-lg text-[#52525B] max-w-2xl mx-auto font-normal leading-relaxed">
        Design responsive forms visually, draft complex layouts with natural language, and deploy to live edge endpoints with built-in version control.
      </p>

      {/* Primary & Secondary CTAs */}
      <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
        <Link
          href={startBuildingHref}
          className="flex h-12 w-full sm:w-auto items-center justify-center gap-2.5 rounded-xl bg-[#18181B] px-7 text-sm font-semibold text-white shadow-craft-lg hover:bg-black transition-all btn-press"
        >
          <span>Start Building</span>
          <ArrowRight className="h-4 w-4" />
        </Link>

        <Link
          href={aiHref}
          className="flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-black/[0.1] bg-white px-6 text-sm font-semibold text-[#18181B] hover:bg-zinc-50 transition-all shadow-craft btn-press"
        >
          <Wand2 className="h-4 w-4 text-[#007AFF]" />
          <span>Prompt to Form</span>
        </Link>
      </div>

      {/* Under CTAs feature list */}
      <div className="mt-8 flex items-center justify-center gap-4 text-xs font-mono text-[#71717A]">
        <span>12 Templates</span>
        <span>·</span>
        <span>Conditional Logic</span>
        <span>·</span>
        <span>Instant Rollbacks</span>
        <span>·</span>
        <span>Zero Boilerplate</span>
      </div>
    </section>
  );
}
