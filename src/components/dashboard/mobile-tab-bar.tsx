'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DASHBOARD_NAV, isNavActive } from './nav-config';

// Home, Forms, [Create], Inbox, Stats — Team/Settings live in the 3-line menu.
const LEFT = DASHBOARD_NAV.slice(0, 2);
const RIGHT = DASHBOARD_NAV.slice(2, 4);

/**
 * Thumb-reachable bottom navigation for phones. Hidden on md+ and inside the
 * form builder, which has its own full-height mobile UI.
 */
export function MobileTabBar() {
  const pathname = usePathname();
  if (pathname.includes('/builder')) return null;

  const createActive = pathname.startsWith('/dashboard/forms/new');

  const renderItem = (item: (typeof DASHBOARD_NAV)[number]) => {
    const active = isNavActive(pathname, item.href);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-medium transition-colors',
          active ? 'text-[#007AFF]' : 'text-[#86868B] active:text-[#1D1D1F]',
        )}
      >
        <Icon className={cn('h-5 w-5', active && 'stroke-[2.25]')} />
        <span>{item.short}</span>
      </Link>
    );
  };

  return (
    <>
      {/* Spacer so page content never hides behind the fixed bar */}
      <div aria-hidden className="md:hidden h-[calc(4rem+env(safe-area-inset-bottom))] shrink-0" />

      <nav
        aria-label="Primary"
        className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-black/[0.08] bg-white/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
      >
        <div className="mx-auto flex h-16 max-w-md items-stretch px-2">
          {LEFT.map(renderItem)}

          <div className="flex flex-1 items-center justify-center">
            <Link
              href="/dashboard/forms/new"
              aria-label="Create form"
              aria-current={createActive ? 'page' : undefined}
              className={cn(
                'flex h-11 w-11 items-center justify-center rounded-full text-white shadow-md transition-transform active:scale-95',
                createActive ? 'bg-[#0062C4]' : 'bg-[#007AFF] shadow-[#007AFF]/30',
              )}
            >
              <Plus className="h-5 w-5 stroke-[2.5]" />
            </Link>
          </div>

          {RIGHT.map(renderItem)}
        </div>
      </nav>
    </>
  );
}
