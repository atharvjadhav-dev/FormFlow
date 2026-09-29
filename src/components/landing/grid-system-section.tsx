'use client';

import React, { useState } from 'react';
import { Grid3X3, Laptop, Smartphone, Tablet } from 'lucide-react';

type ViewportMode = 'desktop' | 'tablet' | 'mobile';

export function GridSystemSection() {
  const [viewport, setViewport] = useState<ViewportMode>('desktop');
  const [splitRatio, setSplitRatio] = useState<'equal' | 'asymmetric' | 'thirds'>('equal');

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-24 border-t border-black/[0.06]">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Explanation */}
        <div className="lg:col-span-5 space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white px-3 py-1 text-xs font-semibold text-[#18181B] shadow-craft-sm">
            <Grid3X3 className="h-3.5 w-3.5 text-[#007AFF]" />
            <span>Responsive 12-Column Grid</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#18181B] leading-tight">
            Design with structure. <br />
            Not arbitrary resizing.
          </h2>
          <p className="text-sm sm:text-base text-[#52525B] leading-relaxed">
            Every input fits into an immutable 12-column grid. No pixel-level drift, misaligned labels, or fragile mobile layout shifts.
          </p>

          {/* Interactive controls on the left */}
          <div className="pt-2 space-y-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#71717A] mb-2 block font-mono">
                Select Layout Preset
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSplitRatio('equal')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    splitRatio === 'equal'
                      ? 'bg-[#18181B] text-white shadow-craft-sm'
                      : 'bg-white border border-black/[0.08] text-[#52525B] hover:bg-zinc-50'
                  }`}
                >
                  6 + 6 (Half)
                </button>
                <button
                  type="button"
                  onClick={() => setSplitRatio('asymmetric')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    splitRatio === 'asymmetric'
                      ? 'bg-[#18181B] text-white shadow-craft-sm'
                      : 'bg-white border border-black/[0.08] text-[#52525B] hover:bg-zinc-50'
                  }`}
                >
                  8 + 4 (Wide / Narrow)
                </button>
                <button
                  type="button"
                  onClick={() => setSplitRatio('thirds')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    splitRatio === 'thirds'
                      ? 'bg-[#18181B] text-white shadow-craft-sm'
                      : 'bg-white border border-black/[0.08] text-[#52525B] hover:bg-zinc-50'
                  }`}
                >
                  4 + 4 + 4 (Thirds)
                </button>
              </div>
            </div>

            <div className="space-y-2 text-xs text-[#18181B]">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#007AFF]" />
                <span>Precision snapping ensures zero visual jitter</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#007AFF]" />
                <span>Responsive auto-stacking on phone screens</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Visual Grid Demonstration */}
        <div className="lg:col-span-7 rounded-3xl border border-black/[0.08] bg-[#FAFAFA] p-6 sm:p-8 space-y-6 shadow-craft">
          {/* Viewport switch toolbar */}
          <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
            <span className="text-xs font-mono font-medium text-[#71717A]">
              Live Grid Simulator
            </span>
            <div className="flex items-center bg-white rounded-lg p-0.5 border border-black/[0.08] shadow-craft-sm">
              <button
                type="button"
                onClick={() => setViewport('desktop')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  viewport === 'desktop' ? 'bg-[#18181B] text-white' : 'text-[#71717A] hover:text-[#18181B]'
                }`}
              >
                <Laptop className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setViewport('tablet')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  viewport === 'tablet' ? 'bg-[#18181B] text-white' : 'text-[#71717A] hover:text-[#18181B]'
                }`}
              >
                <Tablet className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Tablet</span>
              </button>
              <button
                type="button"
                onClick={() => setViewport('mobile')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  viewport === 'mobile' ? 'bg-[#18181B] text-white' : 'text-[#71717A] hover:text-[#18181B]'
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Mobile</span>
              </button>
            </div>
          </div>

          {/* Interactive Responsive Canvas Frame */}
          <div
            className={`mx-auto transition-all duration-300 ${
              viewport === 'desktop'
                ? 'w-full'
                : viewport === 'tablet'
                ? 'max-w-[480px]'
                : 'max-w-[320px]'
            }`}
          >
            <div className="rounded-2xl border border-black/[0.08] bg-white p-5 shadow-craft space-y-4">
              {/* Row 1: Configured Preset */}
              {splitRatio === 'equal' && (
                <div className={`grid gap-3 transition-all ${viewport === 'mobile' ? 'grid-cols-1' : 'grid-cols-12'}`}>
                  <div className={`${viewport === 'mobile' ? 'col-span-1' : 'col-span-6'} rounded-xl border border-black/[0.08] bg-[#FAFAFA] p-3 shadow-craft-sm space-y-1.5`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-semibold text-[#71717A]">First Name</span>
                      <span className="kbd-pill">{viewport === 'mobile' ? 'col-12' : 'col-6'}</span>
                    </div>
                    <div className="h-7 rounded-md bg-white border border-black/[0.08] px-2 flex items-center text-xs text-[#71717A]">
                      Alex
                    </div>
                  </div>
                  <div className={`${viewport === 'mobile' ? 'col-span-1' : 'col-span-6'} rounded-xl border border-black/[0.08] bg-[#FAFAFA] p-3 shadow-craft-sm space-y-1.5`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-semibold text-[#71717A]">Last Name</span>
                      <span className="kbd-pill">{viewport === 'mobile' ? 'col-12' : 'col-6'}</span>
                    </div>
                    <div className="h-7 rounded-md bg-white border border-black/[0.08] px-2 flex items-center text-xs text-[#71717A]">
                      Chen
                    </div>
                  </div>
                </div>
              )}

              {splitRatio === 'asymmetric' && (
                <div className={`grid gap-3 transition-all ${viewport === 'mobile' ? 'grid-cols-1' : 'grid-cols-12'}`}>
                  <div className={`${viewport === 'mobile' ? 'col-span-1' : 'col-span-8'} rounded-xl border border-black/[0.08] bg-[#FAFAFA] p-3 shadow-craft-sm space-y-1.5`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-semibold text-[#71717A]">Street Address</span>
                      <span className="kbd-pill">{viewport === 'mobile' ? 'col-12' : 'col-8'}</span>
                    </div>
                    <div className="h-7 rounded-md bg-white border border-black/[0.08] px-2 flex items-center text-xs text-[#71717A]">
                      452 Broadway Ave
                    </div>
                  </div>
                  <div className={`${viewport === 'mobile' ? 'col-span-1' : 'col-span-4'} rounded-xl border border-black/[0.08] bg-[#FAFAFA] p-3 shadow-craft-sm space-y-1.5`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-semibold text-[#71717A]">Apt / Suite</span>
                      <span className="kbd-pill">{viewport === 'mobile' ? 'col-12' : 'col-4'}</span>
                    </div>
                    <div className="h-7 rounded-md bg-white border border-black/[0.08] px-2 flex items-center text-xs text-[#71717A]">
                      Suite 300
                    </div>
                  </div>
                </div>
              )}

              {splitRatio === 'thirds' && (
                <div className={`grid gap-3 transition-all ${viewport === 'mobile' ? 'grid-cols-1' : 'grid-cols-12'}`}>
                  <div className={`${viewport === 'mobile' ? 'col-span-1' : 'col-span-4'} rounded-xl border border-black/[0.08] bg-[#FAFAFA] p-3 shadow-craft-sm space-y-1.5`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-semibold text-[#71717A]">City</span>
                      <span className="kbd-pill">{viewport === 'mobile' ? 'col-12' : 'col-4'}</span>
                    </div>
                    <div className="h-7 rounded-md bg-white border border-black/[0.08] px-2 flex items-center text-xs text-[#71717A]">San Francisco</div>
                  </div>
                  <div className={`${viewport === 'mobile' ? 'col-span-1' : 'col-span-4'} rounded-xl border border-black/[0.08] bg-[#FAFAFA] p-3 shadow-craft-sm space-y-1.5`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-semibold text-[#71717A]">State</span>
                      <span className="kbd-pill">{viewport === 'mobile' ? 'col-12' : 'col-4'}</span>
                    </div>
                    <div className="h-7 rounded-md bg-white border border-black/[0.08] px-2 flex items-center text-xs text-[#71717A]">CA</div>
                  </div>
                  <div className={`${viewport === 'mobile' ? 'col-span-1' : 'col-span-4'} rounded-xl border border-black/[0.08] bg-[#FAFAFA] p-3 shadow-craft-sm space-y-1.5`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-semibold text-[#71717A]">Postal Code</span>
                      <span className="kbd-pill">{viewport === 'mobile' ? 'col-12' : 'col-4'}</span>
                    </div>
                    <div className="h-7 rounded-md bg-white border border-black/[0.08] px-2 flex items-center text-xs text-[#71717A]">94107</div>
                  </div>
                </div>
              )}

              {/* Row 2: Full Width Field */}
              <div className="rounded-xl border border-black/[0.08] bg-[#FAFAFA] p-3 shadow-craft-sm space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-semibold text-[#71717A]">Cover Letter / Statement</span>
                  <span className="kbd-pill">col-12</span>
                </div>
                <div className="h-10 rounded-md bg-white border border-black/[0.08] px-2 py-1 text-xs text-[#71717A]">
                  Briefly outline why you are applying...
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
