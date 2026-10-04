import {
  LayoutGrid,
  FileText,
  Inbox,
  BarChart3,
  Users,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface DashboardNavItem {
  href: string;
  label: string;
  /** Shorter label for the mobile bottom tab bar. */
  short: string;
  icon: LucideIcon;
}

export const DASHBOARD_NAV: DashboardNavItem[] = [
  { href: '/dashboard', label: 'Overview', short: 'Home', icon: LayoutGrid },
  { href: '/dashboard/forms', label: 'Forms', short: 'Forms', icon: FileText },
  { href: '/dashboard/submissions', label: 'Submissions', short: 'Inbox', icon: Inbox },
  { href: '/dashboard/analytics', label: 'Analytics', short: 'Stats', icon: BarChart3 },
  { href: '/dashboard/team', label: 'Team', short: 'Team', icon: Users },
  { href: '/dashboard/settings', label: 'Settings', short: 'Settings', icon: Settings },
];

export function isNavActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard';
  // "Forms" should not light up while on the "create form" screen — that has its own tab.
  if (href === '/dashboard/forms' && pathname.startsWith('/dashboard/forms/new')) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}
