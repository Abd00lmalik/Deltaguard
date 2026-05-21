import { GlowCard } from '@/components/ui/GlowCard';
import { RiskScoreGauge } from '@/components/ui/RiskScoreGauge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { MOCK_COMPOSITE_SCORE } from '@/lib/mock/signals';
import type { CompositeScore } from '@/types/signals';

interface CompositeSignalScoreProps {
  score?: CompositeScore;
}

export function CompositeSignalScore({ score }: CompositeSignalScoreProps) {
  const activeScore = score ?? MOCK_COMPOSITE_SCORE;
  const val = activeScore.value;
  const label = activeScore.label || 'NEUTRAL';
  const regime = activeScore.regime || 'neutral';
  
  // Dynamic styling based on regime
  let scoreColor = 'text-warning glow-warning';
  let badgeVariant: 'danger' | 'warning' | 'safe' | 'muted' = 'warning';

  if (regime === 'risk-off') {
    scoreColor = 'text-danger glow-danger';
    badgeVariant = 'danger';
  } else if (regime === 'risk-on') {
    scoreColor = 'text-accent-lime glow-accent';
    badgeVariant = 'safe';
  }

  const formattedDate = activeScore.lastUpdated
    ? new Date(activeScore.lastUpdated).toLocaleTimeString()
    : 'just now';

  return (
    <GlowCard glowing className="p-8 text-center">
      <p className={`font-sora text-7xl font-extrabold ${scoreColor}`}>{val !== null ? val : '—'}</p>
      <p className="mt-2 font-manrope text-[11px] font-bold uppercase tracking-[0.24em] text-accent-lime">
        {label} REGIME
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <StatusBadge variant={badgeVariant} label={label} />
        <StatusBadge variant="muted" label="SoSoValue Signal Feed" />
      </div>
      <RiskScoreGauge score={val ?? 0} min={-100} max={100} label="Composite Signal" className="mx-auto mt-6 max-w-md" />
      <p className="mt-4 font-manrope text-xs text-text-muted">Updated {formattedDate}</p>
    </GlowCard>
  );
}

export default CompositeSignalScore;
