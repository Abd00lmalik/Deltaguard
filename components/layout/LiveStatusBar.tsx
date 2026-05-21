// DeltaGuard AI - Live terminal environment status bar component
'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils/cn';

interface ReadinessResponse {
  sosovalue: boolean;
  ssi: boolean;
  sodexPublic: boolean;
  sodexSigned: boolean;
  database: boolean;
  allRequiredForPublicReads: boolean;
  allRequiredForSignedExecution: boolean;
}

export function LiveStatusBar() {
  const [readiness, setReadiness] = useState<ReadinessResponse | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/architecture/readiness')
      .then((res) => res.json())
      .then((data) => {
        if (active) setReadiness(data);
      })
      .catch((err) => console.error('Failed to fetch readiness status:', err));

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex h-9 items-center justify-between border-b border-accent-lime/10 bg-accent-lime/[0.04] px-4 font-manrope text-[11px] text-text-muted">
      <div className="flex items-center gap-5 overflow-x-auto">
        {/* SoSoValue Status */}
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="text-text-muted">SoSoValue:</span>
          <span className={cn(
            "h-1.5 w-1.5 rounded-full",
            readiness?.sosovalue ? "bg-accent-lime shadow-[0_0_8px_rgba(156,255,0,0.5)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse"
          )} />
          <span className={cn("font-medium", readiness?.sosovalue ? "text-accent-lime" : "text-red-500")}>
            {readiness?.sosovalue ? "Connected" : "Offline"}
          </span>
        </div>

        {/* SSI Status */}
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="text-text-muted">SSI:</span>
          <span className={cn(
            "h-1.5 w-1.5 rounded-full",
            readiness?.ssi ? "bg-accent-lime shadow-[0_0_8px_rgba(156,255,0,0.5)]" : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
          )} />
          <span className={cn("font-medium", readiness?.ssi ? "text-accent-lime" : "text-amber-500")}>
            {readiness?.ssi ? "Connected" : "Unavailable"}
          </span>
        </div>

        {/* SoDEX Public Status */}
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="text-text-muted">SoDEX Public:</span>
          <span className={cn(
            "h-1.5 w-1.5 rounded-full",
            readiness?.sodexPublic ? "bg-accent-lime shadow-[0_0_8px_rgba(156,255,0,0.5)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse"
          )} />
          <span className={cn("font-medium", readiness?.sodexPublic ? "text-accent-lime" : "text-red-500")}>
            {readiness?.sodexPublic ? "Active" : "Offline"}
          </span>
        </div>

        {/* SoDEX Signed Status */}
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="text-text-muted">SoDEX Signed:</span>
          <span className={cn(
            "h-1.5 w-1.5 rounded-full",
            readiness?.sodexSigned ? "bg-accent-lime shadow-[0_0_8px_rgba(156,255,0,0.5)] animate-pulse" : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
          )} />
          <span className={cn("font-medium", readiness?.sodexSigned ? "text-accent-lime" : "text-amber-500")}>
            {readiness?.sodexSigned ? "Execution Ready" : "Setup Required"}
          </span>
        </div>
      </div>

      <span className="rounded bg-accent-lime/10 px-1.5 py-0.5 font-manrope text-[10px] font-bold tracking-wider text-accent-lime uppercase">
        Live Testnet
      </span>
    </div>
  );
}

export default LiveStatusBar;
