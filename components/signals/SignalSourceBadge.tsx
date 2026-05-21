'use client';

// DeltaGuard AI - Signal Source Badge Component
// Displays an honest label showing where signal data actually came from.
// Replaces the hardcoded "SoSoValue Live Feed" string everywhere.

import type { SignalSource } from '@/lib/types/signal-source';

const SOURCE_CONFIG: Record<SignalSource, { label: string; colorClass: string; icon: string }> = {
  live:        { label: 'SoSoValue Live Feed',       colorClass: 'text-accent-lime',  icon: '●' },
  derived:     { label: 'SoSoValue-Derived Signals', colorClass: 'text-accent-lime',  icon: '◑' },
  partial:     { label: 'Partial Live Signal Feed',  colorClass: 'text-amber-400',    icon: '◑' },
  cached:      { label: 'Cached Signal Feed',        colorClass: 'text-amber-300',    icon: '○' },
  fallback:    { label: 'Signal Feed Unavailable',   colorClass: 'text-text-muted',   icon: '○' },
  unavailable: { label: 'Signal Feed Unavailable',   colorClass: 'text-text-muted',   icon: '○' },
};

interface SignalSourceBadgeProps {
  source: SignalSource | string;
  cacheAgeSeconds?: number;
  className?: string;
}

export function SignalSourceBadge({ source, cacheAgeSeconds, className = '' }: SignalSourceBadgeProps) {
  const config = SOURCE_CONFIG[source as SignalSource] ?? SOURCE_CONFIG.unavailable;

  return (
    <span className={`inline-flex items-center gap-1.5 font-manrope text-xs ${config.colorClass} ${className}`}>
      <span className="text-[10px]">{config.icon}</span>
      <span>{config.label}</span>
      {source === 'cached' && cacheAgeSeconds !== undefined && (
        <span className="text-text-muted">({Math.round(cacheAgeSeconds / 60)}m ago)</span>
      )}
    </span>
  );
}

export default SignalSourceBadge;
