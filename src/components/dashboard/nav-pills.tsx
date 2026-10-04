'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { DASHBOARD_NAV, isNavActive } from './nav-config';

export function NavPills() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Dashboard"
      className="flex items-center gap-1 bg-black/[0.03] p-1 rounded-full border border-black/[0.04] shrink-0 whitespace-nowrap"
    >
      {DASHBOARD_NAV.map((item) => {
        const isActive = isNavActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'relative rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ease-out select-none shrink-0',
              isActive
                ? 'bg-white text-[#1D1D1F] shadow-sm font-semibold'
                : 'text-[#86868B] hover:text-[#1D1D1F] hover:bg-white/50',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
