'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GlowCard } from '@/components/ui/GlowCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { cn } from '@/lib/utils/cn';
import type { MarketSignal } from '@/types/signals';

const severityRank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, positive: 4 };

export function SignalOverview() {
  const [signals, setSignals] = useState<MarketSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<string>('');

  useEffect(() => {
    fetch('/api/terminal/signals')
      .then((r) => r.json())
      .then((data: { signals?: MarketSignal[]; metadata?: { source: string } }) => {
        const live = (data.signals ?? [])
          .filter((s) => s.value !== null && s.source !== 'unavailable')
          .sort((a, b) => (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9))
          .slice(0, 4);
        setSignals(live);
        setSource(data.metadata?.source ?? '');
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  return (
    <GlowCard className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-sora text-base font-bold text-white">Signal Overview</h3>
          {source && (
            <p className="mt-0.5 font-manrope text-[10px] text-text-muted uppercase tracking-wider">
              {source === 'live' ? '● Live SoSoValue' : source === 'cached' ? '○ Cached' : '○ Unavailable'}
            </p>
          )}
        </div>
        <Link href="/terminal/signals" className="font-manrope text-xs font-semibold text-accent-lime hover:text-white">
          View all signals →
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-white/[0.03]" />
          ))}
        </div>
      ) : signals.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-white/10">
          <p className="font-manrope text-xs text-text-muted">Live signals unavailable</p>
        </div>
      ) : (
        <div className="space-y-3">
          {signals.map((signal) => (
            <div key={signal.id} className="rounded-xl border border-white/5 bg-white/[0.025] p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-manrope text-sm font-semibold text-white">{signal.label}</p>
                <StatusBadge
                  variant={
                    signal.severity === 'critical' ? 'danger'
                    : signal.severity === 'high' ? 'warning'
                    : signal.severity === 'positive' ? 'safe'
                    : 'muted'
                  }
                  label={signal.severity}
                />
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-1.5 flex-1 rounded-full bg-white/10">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      signal.score < -50 ? 'bg-danger'
                      : signal.score < 0 ? 'bg-warning'
                      : 'bg-accent-lime'
                    )}
                    style={{ width: `${Math.min(100, Math.abs(signal.score))}%` }}
                  />
                </div>
                <span className={cn(
                  'font-mono text-xs',
                  signal.score < -50 ? 'text-danger' : signal.score < 0 ? 'text-warning' : 'text-accent-lime'
                )}>
                  {signal.score > 0 ? '+' : ''}{signal.score}
                </span>
              </div>
              {signal.explanation && (
                <p className="mt-2 font-manrope text-[11px] text-text-muted leading-4">{signal.explanation}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </GlowCard>
  );
}

export default SignalOverview;
