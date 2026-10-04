import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { MobileTabBar } from '@/components/dashboard/mobile-tab-bar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { orgId } = await auth({ treatPendingAsSignedOut: false });
  if (!orgId) redirect('/onboarding');

  return (
    <div className="min-h-dvh bg-[#F5F5F7] flex flex-col">
      <DashboardHeader />
      <main className="flex-1 flex flex-col min-h-0 min-w-0">{children}</main>
      <MobileTabBar />
    </div>
  );
}
