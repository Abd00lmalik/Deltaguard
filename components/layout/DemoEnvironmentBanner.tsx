// DeltaGuard AI - Demo environment top banner component
'use client';

import React from 'react';

export function DemoEnvironmentBanner() {
  return (
    <div className="flex h-8 items-center justify-between border-b border-amber-500/15 bg-amber-500/[0.06] px-4 font-manrope text-[11px] text-text-muted">
      <span>
        Guided Prototype — Explore the DeltaGuard flow with structured demonstration data.
      </span>
      <span className="rounded bg-amber-500/10 px-1.5 py-0.5 font-manrope text-[10px] font-bold tracking-wider text-amber-500 uppercase">
        Prototype
      </span>
    </div>
  );
}

export default DemoEnvironmentBanner;
