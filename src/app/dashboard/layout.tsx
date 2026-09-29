import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { OrganizationSwitcher, UserButton } from '@clerk/nextjs';
import { NavPills } from '@/components/dashboard/nav-pills';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { orgId } = await auth();
  if (!orgId) redirect('/onboarding');

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col">
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b border-black/[0.06] backdrop-blur-xl bg-[#F5F5F7]/80 px-6 transition-all">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="h-8 w-8 rounded-xl bg-[#007AFF] flex items-center justify-center text-white shadow-sm shadow-[#007AFF]/25 group-hover:scale-105 transition-all">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-[#1D1D1F]">FormFlow</span>
              <span className="text-[10px] font-semibold tracking-wider text-[#86868B] bg-black/[0.04] px-2 py-0.5 rounded-full">STUDIO</span>
            </div>
          </Link>

          <NavPills />
        </div>

        <div className="flex items-center gap-4">
          <div className="rounded-full bg-white/70 p-1 border border-black/[0.06] shadow-sm flex items-center">
            <OrganizationSwitcher afterSelectOrganizationUrl="/dashboard" />
          </div>
          <UserButton />
        </div>
      </header>
      <main className="flex-1 flex flex-col min-h-0">{children}</main>
    </div>
  );
}

