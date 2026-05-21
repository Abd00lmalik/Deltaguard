'use client';

import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Droplets,
  GitBranch,
  Landmark,
  Network,
  Newspaper,
  Percent,
  TrendingDown,
  Waves
} from 'lucide-react';
import { GlowCard } from '@/components/ui/GlowCard';
import { PillButton } from '@/components/ui/PillButton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SignalSourceBadge } from '@/components/signals/SignalSourceBadge';
import type { MarketSignal, SignalCategory } from '@/types/signals';
import { cn } from '@/lib/utils/cn';
import { formatRelativeTime } from '@/lib/utils/format';

const categoryIcons: Record<SignalCategory, LucideIcon> = {
  'etf-flow-pressure': TrendingDown,
  'macro-treasury-pressure': Landmark,
  'btc-volatility': Waves,
  'stablecoin-liquidity': Droplets,
  'market-sentiment': BarChart3,
  'funding-rate-pressure': Percent,
  'onchain-risk': Network,
  'ssi-momentum': GitBranch,
  'news-regime-alert': Newspaper
};

function scoreColor(score: number) {
  if (score < -50) return 'bg-danger text-danger';
  if (score < 0) return 'bg-warning text-warning';
  return 'bg-accent-lime text-accent-lime';
}

export function SignalCard({ signal }: { signal: MarketSignal }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = categoryIcons[signal.category];
  const signalValue = signal.value;
  const isUnavailable = signalValue === null || signal.source === 'unavailable';

  if (isUnavailable) {
    return (
      <GlowCard className="p-5 opacity-60">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-2 text-text-muted">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-sora text-sm font-bold text-text-secondary">{signal.label}</h3>
              <p className="mt-1 font-manrope text-[11px] text-text-muted">{formatRelativeTime(signal.timestamp)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono text-lg font-bold text-text-muted">—</p>
            <StatusBadge label="unavailable" variant="muted" />
          </div>
        </div>
        <p className="mt-4 font-manrope text-xs text-text-muted italic">
          {signal.unavailableReason ?? 'Signal data not available.'}
        </p>
        <div className="mt-3">
          <SignalSourceBadge source={signal.source ?? 'unavailable'} />
        </div>
      </GlowCard>
    );
  }

  const offset = ((signal.score + 100) / 200) * 100;

  return (
    <GlowCard className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-accent-lime/20 bg-accent-lime-dim p-2 text-accent-lime">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-sora text-sm font-bold text-white">{signal.label}</h3>
            <p className="mt-1 font-manrope text-[11px] text-text-muted">{formatRelativeTime(signal.timestamp)}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={cn('font-mono text-lg font-bold', scoreColor(signal.score).split(' ')[1])}>{signal.score}</p>
          <StatusBadge
            label={signal.severity}
            variant={signal.severity === 'critical' ? 'danger' : signal.severity === 'high' ? 'warning' : 'muted'}
          />
        </div>
      </div>

      <div className="relative mt-5 h-2 rounded-full bg-white/10">
        <div className="absolute left-1/2 top-[-4px] h-4 w-px bg-white/20" />
        <div
          className={cn('absolute top-0 h-full rounded-full', scoreColor(signal.score).split(' ')[0])}
          style={{
            left: signal.score < 0 ? `${offset}%` : '50%',
            width: `${Math.abs(signal.score) / 2}%`
          }}
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="font-manrope text-xs text-text-secondary">{signal.confidence}% confidence</span>
        <SignalSourceBadge source={signal.source ?? 'live'} />
      </div>

      <p className={cn('mt-4 font-manrope text-sm leading-6 text-text-secondary', !expanded && 'line-clamp-2')}>
        {signal.explanation}
      </p>
      <PillButton variant="ghost" size="sm" className="mt-3 px-0" onClick={() => setExpanded((value) => !value)}>
        {expanded ? 'Show less' : 'Read more'}
      </PillButton>
    </GlowCard>
  );
}

export default SignalCard;
