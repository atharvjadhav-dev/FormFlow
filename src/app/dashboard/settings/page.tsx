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
    <div className="mx-auto max-w-2xl px-6 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1D1D1F]">Settings</h1>
        <p className="mt-1 text-xs text-[#86868B]">
          Configure workspace defaults and form scheduling settings.
        </p>
      </div>

      <div className="rounded-2xl border border-black/[0.06] bg-white/70 p-4 shadow-sm backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F5F5F7] text-[#86868B]">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#1D1D1F]">Team &amp; Organization</p>
            <p className="text-[11px] text-[#86868B]">Manage members, invites, and branding on the Team page.</p>
          </div>
        </div>
        <Link
          href="/dashboard/team"
          className="rounded-full bg-[#F5F5F7] px-3.5 py-1.5 text-xs font-medium text-[#1D1D1F] hover:bg-[#E5E5EA] transition-all"
        >
          Manage Team →
        </Link>
      </div>

      <SettingsForm currentTimezone={org.timezone} timezones={TIMEZONES} />
    </div>
  );
}

