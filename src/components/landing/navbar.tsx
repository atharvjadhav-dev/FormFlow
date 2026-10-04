'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, X, Sparkles, ArrowRight, Layout } from 'lucide-react';

interface NavbarProps {
  isAuthenticated: boolean;
}

export function Navbar({ isAuthenticated }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const startBuildingHref = isAuthenticated ? '/dashboard/forms/new' : '/sign-up';
  const aiHref = isAuthenticated ? '/dashboard/forms/new?mode=ai' : '/sign-up?redirect_url=/dashboard/forms/new?mode=ai';
  const authHref = isAuthenticated ? '/dashboard' : '/sign-in';
  const authLabel = isAuthenticated ? 'Dashboard' : 'Log in';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-black/[0.06] bg-white/80 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 text-[#1D1D1F] hover:opacity-90 transition-opacity">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1D1D1F] text-white">
            <Layout className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold tracking-tight">FormFlow</span>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-[#86868B]">
          <a href="#demo" className="hover:text-[#1D1D1F] transition-colors">
            Product
          </a>
          <a href="#features" className="hover:text-[#1D1D1F] transition-colors">
            Features
          </a>
          <a href="#ai" className="flex items-center gap-1 hover:text-[#1D1D1F] transition-colors">
            <Sparkles className="h-3 w-3 text-[#007AFF]" />
            <span>AI Generation</span>
          </a>
          <a href="#templates" className="hover:text-[#1D1D1F] transition-colors">
            Templates
          </a>
        </nav>

        {/* Desktop Auth & CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href={authHref}
            className="text-xs font-medium text-[#86868B] hover:text-[#1D1D1F] px-2.5 py-1.5 transition-colors"
          >
            {authLabel}
          </Link>

          <Link
            href={startBuildingHref}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-[#1D1D1F] px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-black transition-colors"
          >
            <span>Start Building</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Small 3 lines button for mobile nav bar */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg border border-black/[0.08] bg-white text-[#1D1D1F] hover:bg-black/[0.04] shadow-2xs transition-colors"
          aria-label="Toggle navigation menu"
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? (
            <X className="h-4 w-4" />
          ) : (
            <div className="flex flex-col justify-center items-center gap-[3px]">
              <span className="h-[1.5px] w-3.5 rounded-full bg-[#1D1D1F]" />
              <span className="h-[1.5px] w-3.5 rounded-full bg-[#1D1D1F]" />
              <span className="h-[1.5px] w-3.5 rounded-full bg-[#1D1D1F]" />
            </div>
          )}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-black/[0.06] bg-white px-4 py-4 space-y-3 animate-in slide-in-from-top-2 duration-150">
          <nav className="flex flex-col space-y-2 text-sm font-medium text-[#1D1D1F]">
            <a
              href="#demo"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded-lg hover:bg-black/[0.03]"
            >
              Product Demo
            </a>
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded-lg hover:bg-black/[0.03]"
            >
              Features
            </a>
            <a
              href="#ai"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-black/[0.03]"
            >
              <Sparkles className="h-4 w-4 text-[#007AFF]" />
              <span>AI Form Generation</span>
            </a>
            <a
              href="#templates"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded-lg hover:bg-black/[0.03]"
            >
              Templates
            </a>
          </nav>

          <div className="pt-3 border-t border-black/[0.06] flex flex-col gap-2">
            <Link
              href={startBuildingHref}
              onClick={() => setMobileMenuOpen(false)}
              className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-[#1D1D1F] text-xs font-semibold text-white shadow-xs"
            >
              <span>Start Building</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
            <Link
              href={aiHref}
              onClick={() => setMobileMenuOpen(false)}
              className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-blue-500/20 bg-blue-50/50 text-xs font-semibold text-[#007AFF]"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Create with AI</span>
            </Link>
            <Link
              href={authHref}
              onClick={() => setMobileMenuOpen(false)}
              className="text-center py-2 text-xs font-medium text-[#86868B] hover:text-[#1D1D1F]"
            >
              {authLabel}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
