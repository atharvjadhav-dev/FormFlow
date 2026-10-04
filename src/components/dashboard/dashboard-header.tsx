'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { OrganizationSwitcher, UserButton } from '@clerk/nextjs';
import { X } from 'lucide-react';
import { NavPills } from '@/components/dashboard/nav-pills';
import { DASHBOARD_NAV, isNavActive } from '@/components/dashboard/nav-config';
import { cn } from '@/lib/utils';

export function DashboardHeader() {
  const pathname = usePathname();
  // Remember which page the drawer was opened on; navigating anywhere closes it
  // automatically without a setState-in-effect.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const menuOpen = openedOn === pathname;

  return (
    <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-[#F5F5F7]/90 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
        {/* Left: brand + desktop nav */}
        <div className="flex min-w-0 items-center gap-6">
          <Link href="/dashboard" className="flex shrink-0 items-center gap-2 group" aria-label="FormFlow home">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#007AFF] text-white shadow-sm shadow-[#007AFF]/25 transition-transform group-hover:scale-105">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </span>
            <span className="text-base font-bold tracking-tight text-[#1D1D1F]">FormFlow</span>
            <span className="hidden sm:inline text-[10px] font-semibold tracking-wider text-[#86868B] bg-black/[0.04] px-2 py-0.5 rounded-full">
              STUDIO
            </span>
          </Link>

          <div className="hidden lg:block">
            <NavPills />
          </div>
        </div>

        {/* Right: org switcher (tablet+), account, menu */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden sm:flex items-center rounded-full border border-black/[0.06] bg-white/70 p-0.5 shadow-sm">
            <OrganizationSwitcher hidePersonal afterSelectOrganizationUrl="/dashboard" />
          </div>
          <div className="flex h-8 w-8 items-center justify-center">
            <UserButton />
          </div>

          {/* Small 3-line menu button */}
          <button
            type="button"
            onClick={() => setOpenedOn(menuOpen ? null : pathname)}
            className="lg:hidden flex h-8 w-8 items-center justify-center rounded-lg border border-black/[0.08] bg-white text-[#1D1D1F] shadow-2xs transition-colors hover:bg-black/[0.04]"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="dashboard-mobile-menu"
          >
            {menuOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <span className="flex flex-col items-center justify-center gap-[3px]" aria-hidden>
                <span className="h-[1.5px] w-3.5 rounded-full bg-[#1D1D1F]" />
                <span className="h-[1.5px] w-3.5 rounded-full bg-[#1D1D1F]" />
                <span className="h-[1.5px] w-3.5 rounded-full bg-[#1D1D1F]" />
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Drawer (phones + tablets) */}
      {menuOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpenedOn(null)}
            className="lg:hidden fixed inset-0 top-14 z-[-1] bg-black/20"
          />
          <div
            id="dashboard-mobile-menu"
            className="lg:hidden border-t border-black/[0.06] bg-white px-4 pt-3 pb-4 shadow-sm animate-in slide-in-from-top-2 duration-150"
          >
            <div className="sm:hidden mb-3 flex items-center justify-between gap-3 rounded-xl border border-black/[0.06] bg-[#F5F5F7] px-3 py-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B]">Workspace</span>
              <div className="min-w-0">
                <OrganizationSwitcher hidePersonal afterSelectOrganizationUrl="/dashboard" />
              </div>
            </div>

            <nav aria-label="Dashboard" className="grid grid-cols-2 gap-2">
              {DASHBOARD_NAV.map((item) => {
                const isActive = isNavActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpenedOn(null)}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-2.5 rounded-xl px-3 py-3 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-[#007AFF]/10 text-[#007AFF] font-semibold'
                        : 'bg-[#F5F5F7] text-[#1D1D1F] hover:bg-black/[0.06]',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
