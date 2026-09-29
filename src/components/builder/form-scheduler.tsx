'use client';

import React, { useState } from 'react';
import { Calendar, Clock, Check, X, Sparkles, AlertCircle, ChevronDown } from 'lucide-react';

interface FormSchedulerProps {
  startAt: string; // "YYYY-MM-DDTHH:mm" or ""
  endAt: string;   // "YYYY-MM-DDTHH:mm" or ""
  timezone: string;
  onStartAtChange: (val: string) => void;
  onEndAtChange: (val: string) => void;
}

const COMMON_TIMES = [
  { value: '09:00', label: '09:00 AM (Morning)' },
  { value: '12:00', label: '12:00 PM (Noon)' },
  { value: '17:00', label: '05:00 PM (End of day)' },
  { value: '18:00', label: '06:00 PM (Evening)' },
  { value: '23:59', label: '11:59 PM (Midnight deadline)' },
];

export function FormScheduler({
  startAt,
  endAt,
  timezone,
  onStartAtChange,
  onEndAtChange,
}: FormSchedulerProps) {
  // Mode tabs: 'immediate' | 'scheduled'
  const isStartScheduled = Boolean(startAt);
  const [showCustomEnd, setShowCustomEnd] = useState<boolean>(Boolean(endAt));

  // Helper to format date in timezone
  function getDateInTimezone(offsetDays: number = 0): string {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
    return parts; // "YYYY-MM-DD"
  }

  // Pre-calculated dates
  const today = getDateInTimezone(0);
  const tomorrow = getDateInTimezone(1);

  // Parse startAt into date & time
  const startDate = startAt ? startAt.split('T')[0] : tomorrow;
  const startTime = startAt && startAt.includes('T') ? startAt.split('T')[1] : '09:00';

  // Parse endAt into date & time
  const endDate = endAt ? endAt.split('T')[0] : getDateInTimezone(7);
  const endTime = endAt && endAt.includes('T') ? endAt.split('T')[1] : '23:59';

  // Quick preset triggers
  const setExpiryPreset = (days: number) => {
    const targetDate = getDateInTimezone(days);
    onEndAtChange(`${targetDate}T23:59`);
    setShowCustomEnd(false);
  };

  const setLaunchPreset = (type: 'tomorrow' | 'monday') => {
    if (type === 'tomorrow') {
      onStartAtChange(`${tomorrow}T09:00`);
    } else {
      const d = new Date();
      const day = d.getDay();
      const daysUntilMonday = day === 0 ? 1 : 8 - day;
      const mondayDate = getDateInTimezone(daysUntilMonday);
      onStartAtChange(`${mondayDate}T09:00`);
    }
  };

  // Helper to format human friendly preview
  function formatHumanDateTime(val: string): string {
    if (!val) return '';
    try {
      const [d, t] = val.split('T');
      const [year, month, day] = d.split('-').map(Number);
      const [hours, minutes] = t.split(':').map(Number);
      const dateObj = new Date(year, month - 1, day, hours, minutes);
      return dateObj.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }) + ` at ${dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } catch {
      return val;
    }
  }

  // Check which endAt preset is active
  const isNever = !endAt;
  const is24h = endAt === `${tomorrow}T23:59`;
  const is7d = endAt === `${getDateInTimezone(7)}T23:59`;
  const is30d = endAt === `${getDateInTimezone(30)}T23:59`;

  return (
    <div className="space-y-5 text-sm">
      {/* 2-Column Schedule Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* ========================================================================= */}
        {/* 1. OPENS AT (LAUNCH SCHEDULE) */}
        {/* ========================================================================= */}
        <div className="rounded-2xl border border-black/[0.08] bg-[#FAFAFA] p-4.5 space-y-3.5 shadow-craft-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#007AFF]" />
              <span className="font-semibold text-xs uppercase tracking-wider text-[#18181B]">
                Launch (Opens At)
              </span>
            </div>
            {startAt && (
              <button
                type="button"
                onClick={() => onStartAtChange('')}
                className="text-[11px] font-medium text-[#71717A] hover:text-rose-600 flex items-center gap-1 transition-colors"
              >
                <X className="h-3 w-3" />
                <span>Reset to Immediate</span>
              </button>
            )}
          </div>

          {/* Mode Pill Toggle: Immediate vs Scheduled */}
          <div className="flex rounded-xl bg-white p-1 border border-black/[0.08] shadow-craft-sm">
            <button
              type="button"
              onClick={() => onStartAtChange('')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                !isStartScheduled
                  ? 'bg-[#18181B] text-white shadow-2xs font-semibold'
                  : 'text-[#71717A] hover:text-[#18181B]'
              }`}
            >
              Immediately upon publish
            </button>
            <button
              type="button"
              onClick={() => {
                if (!startAt) onStartAtChange(`${tomorrow}T09:00`);
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                isStartScheduled
                  ? 'bg-[#18181B] text-white shadow-2xs font-semibold'
                  : 'text-[#71717A] hover:text-[#18181B]'
              }`}
            >
              Schedule date
            </button>
          </div>

          {/* Scheduled details (if active) */}
          {isStartScheduled && (
            <div className="space-y-3 pt-1 animate-in fade-in duration-150">
              {/* Quick shortcut chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-[#71717A]">Quick:</span>
                <button
                  type="button"
                  onClick={() => setLaunchPreset('tomorrow')}
                  className="px-2 py-0.5 rounded-md bg-white border border-black/[0.08] text-[11px] font-medium text-[#18181B] hover:bg-zinc-50 shadow-craft-sm"
                >
                  Tomorrow 9 AM
                </button>
                <button
                  type="button"
                  onClick={() => setLaunchPreset('monday')}
                  className="px-2 py-0.5 rounded-md bg-white border border-black/[0.08] text-[11px] font-medium text-[#18181B] hover:bg-zinc-50 shadow-craft-sm"
                >
                  Next Monday 9 AM
                </button>
              </div>

              {/* Clean Date & Time Controls */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-[#71717A] block mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    min={today}
                    onChange={(e) => onStartAtChange(`${e.target.value}T${startTime}`)}
                    className="h-9 w-full rounded-xl border border-black/[0.1] bg-white px-2.5 text-xs text-[#18181B] focus:outline-none focus:border-[#18181B] shadow-craft-sm"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-[#71717A] block mb-1">
                    Time
                  </label>
                  <select
                    value={startTime}
                    onChange={(e) => onStartAtChange(`${startDate}T${e.target.value}`)}
                    className="h-9 w-full rounded-xl border border-black/[0.1] bg-white px-2 text-xs text-[#18181B] focus:outline-none focus:border-[#18181B] shadow-craft-sm"
                  >
                    {COMMON_TIMES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="text-[11px] text-[#52525B]">
                📅 Opens: <strong className="text-[#18181B]">{formatHumanDateTime(startAt)}</strong>
              </p>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 2. CLOSES AT (EXPIRATION SCHEDULE) */}
        {/* ========================================================================= */}
        <div className="rounded-2xl border border-black/[0.08] bg-[#FAFAFA] p-4.5 space-y-3.5 shadow-craft-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#007AFF]" />
              <span className="font-semibold text-xs uppercase tracking-wider text-[#18181B]">
                Expiration (Closes At)
              </span>
            </div>
            {endAt && (
              <button
                type="button"
                onClick={() => {
                  onEndAtChange('');
                  setShowCustomEnd(false);
                }}
                className="text-[11px] font-medium text-[#71717A] hover:text-rose-600 flex items-center gap-1 transition-colors"
              >
                <X className="h-3 w-3" />
                <span>Never expire</span>
              </button>
            )}
          </div>

          {/* Quick preset buttons */}
          <div className="grid grid-cols-5 gap-1.5">
            <button
              type="button"
              onClick={() => {
                onEndAtChange('');
                setShowCustomEnd(false);
              }}
              className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all text-center ${
                isNever && !showCustomEnd
                  ? 'bg-[#18181B] text-white shadow-2xs font-semibold'
                  : 'bg-white border border-black/[0.08] text-[#71717A] hover:text-[#18181B] hover:bg-zinc-50'
              }`}
            >
              Never
            </button>
            <button
              type="button"
              onClick={() => setExpiryPreset(1)}
              className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all text-center ${
                is24h
                  ? 'bg-[#18181B] text-white shadow-2xs font-semibold'
                  : 'bg-white border border-black/[0.08] text-[#71717A] hover:text-[#18181B] hover:bg-zinc-50'
              }`}
            >
              +24h
            </button>
            <button
              type="button"
              onClick={() => setExpiryPreset(7)}
              className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all text-center ${
                is7d
                  ? 'bg-[#18181B] text-white shadow-2xs font-semibold'
                  : 'bg-white border border-black/[0.08] text-[#71717A] hover:text-[#18181B] hover:bg-zinc-50'
              }`}
            >
              +7d
            </button>
            <button
              type="button"
              onClick={() => setExpiryPreset(30)}
              className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all text-center ${
                is30d
                  ? 'bg-[#18181B] text-white shadow-2xs font-semibold'
                  : 'bg-white border border-black/[0.08] text-[#71717A] hover:text-[#18181B] hover:bg-zinc-50'
              }`}
            >
              +30d
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCustomEnd(true);
                if (!endAt) {
                  onEndAtChange(`${getDateInTimezone(7)}T23:59`);
                }
              }}
              className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all text-center ${
                showCustomEnd || (endAt && !is24h && !is7d && !is30d)
                  ? 'bg-[#18181B] text-white shadow-2xs font-semibold'
                  : 'bg-white border border-black/[0.08] text-[#71717A] hover:text-[#18181B] hover:bg-zinc-50'
              }`}
            >
              Custom
            </button>
          </div>

          {/* Custom Date Picker (if active) */}
          {(showCustomEnd || (endAt && !is24h && !is7d && !is30d)) && (
            <div className="space-y-2 pt-1 animate-in fade-in duration-150">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-[#71717A] block mb-1">
                    Expiration Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    min={today}
                    onChange={(e) => onEndAtChange(`${e.target.value}T${endTime}`)}
                    className="h-9 w-full rounded-xl border border-black/[0.1] bg-white px-2.5 text-xs text-[#18181B] focus:outline-none focus:border-[#18181B] shadow-craft-sm"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-[#71717A] block mb-1">
                    Expiration Time
                  </label>
                  <select
                    value={endTime}
                    onChange={(e) => onEndAtChange(`${endDate}T${e.target.value}`)}
                    className="h-9 w-full rounded-xl border border-black/[0.1] bg-white px-2 text-xs text-[#18181B] focus:outline-none focus:border-[#18181B] shadow-craft-sm"
                  >
                    {COMMON_TIMES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Expiration summary text */}
          <p className="text-[11px] text-[#52525B]">
            {endAt ? (
              <>
                ⏰ Closes: <strong className="text-[#18181B]">{formatHumanDateTime(endAt)}</strong>
              </>
            ) : (
              <span className="text-[#71717A]">Form remains active indefinitely.</span>
            )}
          </p>
        </div>
      </div>

      {/* Human Status Summary Banner */}
      <div className="rounded-xl border border-black/[0.06] bg-[#FAFAFA] p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
          <span className="text-xs text-[#18181B] font-medium">
            {startAt && endAt ? (
              <>
                Active window: <strong>{formatHumanDateTime(startAt)}</strong> through <strong>{formatHumanDateTime(endAt)}</strong>
              </>
            ) : endAt ? (
              <>
                Active immediately until <strong>{formatHumanDateTime(endAt)}</strong>
              </>
            ) : startAt ? (
              <>
                Scheduled to open on <strong>{formatHumanDateTime(startAt)}</strong> (Never expires)
              </>
            ) : (
              'Form is live immediately upon publish · Never expires'
            )}
          </span>
        </div>
        <span className="text-[11px] font-mono text-[#71717A] hidden sm:inline">
          {timezone}
        </span>
      </div>
    </div>
  );
}
