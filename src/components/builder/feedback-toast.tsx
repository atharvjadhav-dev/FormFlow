'use client';

import { useEffect } from 'react';
import { cn } from '@/lib/utils';

export function FeedbackToast({
  message,
  onClear,
}: {
  message: string | null;
  onClear: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClear();
    }, 1500);
    return () => clearTimeout(timer);
  }, [message, onClear]);

  if (!message) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-200 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center gap-2 rounded-full bg-[#1D1D1F]/90 backdrop-blur-md px-4 py-1.5 text-xs font-medium text-white shadow-lg border border-white/10">
        <span className="h-1.5 w-1.5 rounded-full bg-[#007AFF]" />
        <span>{message}</span>
      </div>
    </div>
  );
}
