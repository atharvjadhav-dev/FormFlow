'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/input';
import { updateOrgTimezone } from './actions';
import { Check, Globe } from 'lucide-react';

export function SettingsForm({ currentTimezone, timezones }: { currentTimezone: string; timezones: string[] }) {
  const [timezone, setTimezone] = useState(currentTimezone);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSave() {
    startTransition(async () => {
      await updateOrgTimezone(timezone);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  return (
    <div className="rounded-3xl border border-black/[0.06] bg-white p-6 sm:p-8 shadow-apple space-y-5">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#007AFF]/10 text-[#007AFF]">
          <Globe className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-[#1D1D1F]">Default Timezone</h2>
          <p className="text-xs text-[#86868B]">Used for scheduling open and close dates across all new forms.</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="timezone" className="text-xs font-semibold text-[#1D1D1F]">
          Select Timezone
        </Label>
        <select
          id="timezone"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="h-10 w-full rounded-xl border border-black/[0.08] bg-[#F5F5F7]/80 px-3 text-xs font-medium text-[#1D1D1F] focus:border-[#007AFF] focus:outline-none"
        >
          {timezones.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-black/[0.04]">
        {saved ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
            <Check className="h-3.5 w-3.5" /> Timezone updated
          </span>
        ) : (
          <span />
        )}

        <Button
          onClick={handleSave}
          disabled={isPending || timezone === currentTimezone}
          size="sm"
          className="rounded-full bg-[#007AFF] text-white hover:bg-[#0071E3] font-medium text-xs px-5 shadow-apple-hover disabled:opacity-50"
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
}

