import { GlowCard } from '@/components/ui/GlowCard';

export function DecisionRuleCard() {
  return (
    <GlowCard className="p-5">
      <h3 className="font-sora text-base font-bold text-white">Decision Matrix</h3>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {[
          ['Score < -50 + delta > 0.5', 'HEDGE', 'Propose partial short hedge, confirmation required.'],
          ['Score -50 to +20', 'WATCH', 'Monitor signals, no order submitted.'],
          ['Score > +20', 'NO ACTION', 'Reduce hedge only after review if one exists.']
        ].map(([rule, decision, body]) => (
          <div key={rule} className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
            <p className="font-mono text-xs text-accent-lime">{rule}</p>
            <p className="mt-3 font-sora text-lg font-bold text-white">{decision}</p>
            <p className="mt-2 font-manrope text-sm leading-6 text-text-secondary">{body}</p>
          </div>
        ))}
      </div>
    </GlowCard>
  );
}

export default DecisionRuleCard;
