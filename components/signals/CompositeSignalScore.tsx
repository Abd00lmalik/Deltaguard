import { GlowCard } from '@/components/ui/GlowCard';
import { RiskScoreGauge } from '@/components/ui/RiskScoreGauge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { MOCK_COMPOSITE_SCORE } from '@/lib/mock/signals';

export function CompositeSignalScore() {
  return (
    <GlowCard glowing className="p-8 text-center">
      <p className="font-sora text-7xl font-extrabold text-danger glow-danger">{MOCK_COMPOSITE_SCORE.value}</p>
      <p className="mt-2 font-manrope text-[11px] font-bold uppercase tracking-[0.24em] text-accent-lime">
        RISK-OFF REGIME
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <StatusBadge variant="danger" label="Critical" />
        <StatusBadge variant="muted" label="SoSoValue Signal Feed" />
      </div>
      <RiskScoreGauge score={MOCK_COMPOSITE_SCORE.value} min={-100} max={100} label="Composite Signal" className="mx-auto mt-6 max-w-md" />
      <p className="mt-4 font-manrope text-xs text-text-muted">Updated just now</p>
    </GlowCard>
  );
}

export default CompositeSignalScore;
