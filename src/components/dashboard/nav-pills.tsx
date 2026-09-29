'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/forms', label: 'Forms' },
  { href: '/dashboard/submissions', label: 'Submissions' },
  { href: '/dashboard/analytics', label: 'Analytics' },
  { href: '/dashboard/team', label: 'Team' },
  { href: '/dashboard/settings', label: 'Settings' },
];

export function NavPills() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 bg-black/[0.03] p-1 rounded-full border border-black/[0.04]">
      {NAV.map((item) => {
        const isActive =
          item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'relative rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ease-out select-none',
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
