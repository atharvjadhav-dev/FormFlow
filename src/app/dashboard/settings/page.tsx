import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { withOrg } from '@/db/client';
import { organizations } from '@/db/schema';
import { SettingsForm } from './settings-form';
import { requireOrgAuth } from '@/lib/auth';
import { Globe, Users } from 'lucide-react';

const TIMEZONES = ['Asia/Kolkata', 'Asia/Dubai', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'UTC'];

export default async function SettingsPage() {
  const { orgId } = await requireOrgAuth();

  const org = await withOrg(orgId, async (tx) => {
    const [row] = await tx.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
    return row;
  });

  if (!org) return null;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-6 sm:py-10 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1D1D1F]">Settings</h1>
        <p className="mt-0.5 text-xs sm:text-sm text-[#86868B]">
          Configure workspace defaults and form scheduling settings.
        </p>
      </div>

      <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-apple flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#F5F5F7] text-[#86868B]">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#1D1D1F]">Team &amp; Organization</p>
            <p className="text-[11px] text-[#86868B]">Manage members, invites, and branding on the Team page.</p>
          </div>
        </div>
        <Link
          href="/dashboard/team"
          className="self-start sm:self-auto rounded-full bg-[#F5F5F7] px-3.5 py-1.5 text-xs font-medium text-[#1D1D1F] hover:bg-[#E5E5EA] transition-all"
        >
          Manage Team →
        </Link>
      </div>

      <SettingsForm currentTimezone={org.timezone} timezones={TIMEZONES} />
    </div>
  );
}

