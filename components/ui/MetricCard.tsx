import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import { GlowCard } from './GlowCard';
import { cn } from '@/lib/utils/cn';

export type MetricTrend = 'up' | 'down' | 'neutral';
export type MetricHighlight = 'lime' | 'positive' | 'danger' | 'warning' | 'neutral';

interface DGMetricCardProps {
  label: string;
  value: string;
  subtext: string;
  trend?: MetricTrend;
  highlight?: MetricHighlight;
  className?: string;
}

const highlightStyles: Record<MetricHighlight, string> = {
  lime: 'text-accent-lime',
  positive: 'text-accent-lime',
  danger: 'text-danger',
  warning: 'text-warning',
  neutral: 'text-white'
};

export function DGMetricCard({
  label,
  value,
  subtext,
  trend = 'neutral',
  highlight = 'neutral',
  className
}: DGMetricCardProps) {
  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : ArrowRight;

  return (
    <GlowCard className={cn('p-5', className)} glowing={highlight === 'positive' || highlight === 'lime'}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-manrope text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
            {label}
          </p>
          <p className={cn('mt-3 font-sora text-3xl font-bold', highlightStyles[highlight])}>{value}</p>
        </div>
        <div
          className={cn(
            'rounded-full border p-2',
            highlight === 'danger' && 'border-danger/25 bg-danger-dim text-danger',
            highlight === 'warning' && 'border-warning/25 bg-warning-dim text-warning',
            (highlight === 'positive' || highlight === 'lime') &&
              'border-accent-lime/25 bg-accent-lime-dim text-accent-lime',
            highlight === 'neutral' && 'border-white/10 bg-white/5 text-text-secondary'
          )}
        >
          <TrendIcon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 font-manrope text-sm text-text-secondary">{subtext}</p>
    </GlowCard>
  );
}

export default DGMetricCard;
