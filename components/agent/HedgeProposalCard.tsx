'use client';

import { useRouter } from 'next/navigation';
import { ArrowUpRight, ShieldCheck } from 'lucide-react';
import { GlowCard } from '@/components/ui/GlowCard';
import { PillButton } from '@/components/ui/PillButton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { AgentReasoningOutput } from '@/types/agent';
import { formatCurrency } from '@/lib/utils/format';
import { MOCK_PENDING_ORDER } from '@/lib/mock/orders';

interface HedgeProposalCardProps {
  output?: AgentReasoningOutput | null;
  full?: boolean;
}

export function HedgeProposalCard({ output, full = false }: HedgeProposalCardProps) {
  const router = useRouter();
  const recommendation = output?.hedgeRecommendation;
  const notional = recommendation?.notionalUsd ?? MOCK_PENDING_ORDER.notionalUsd;

  if (output && output.decision !== 'hedge') {
    return (
      <GlowCard className="p-5">
        <StatusBadge variant="muted" label="Watch Mode" />
        <h3 className="mt-4 font-sora text-xl font-bold text-white">No Hedge Proposed</h3>
        <p className="mt-2 font-manrope text-sm leading-6 text-text-secondary">
          The agent is monitoring signals. No order is created under the current rule set.
        </p>
      </GlowCard>
    );
  }

  return (
    <GlowCard glowing className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-full border border-accent-lime/25 bg-accent-lime-dim p-2 text-accent-lime">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-sora text-lg font-bold text-white">Hedge Proposal</h3>
            <p className="mt-1 font-manrope text-xs text-text-muted">Manual confirmation required</p>
          </div>
        </div>
        <StatusBadge variant="hedge" label="Hedge Ready" />
      </div>

      <div className={`mt-5 grid gap-3 ${full ? 'sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-2'}`}>
        {[
          ['Pair', recommendation?.pair ?? MOCK_PENDING_ORDER.pair],
          ['Direction', (recommendation?.direction ?? MOCK_PENDING_ORDER.direction).toUpperCase()],
          ['Leverage', `${recommendation?.leverage ?? MOCK_PENDING_ORDER.leverage}x`],
          ['Notional', formatCurrency(notional)],
          ['Estimated Entry', formatCurrency(MOCK_PENDING_ORDER.estimatedPrice, 0)],
          ['Slippage Est.', `${MOCK_PENDING_ORDER.slippageEstimate}%`],
          ['Venue', 'SoDEX'],
          ['Status', 'PENDING YOUR APPROVAL'],
          ['Confidence', `${output?.confidence ?? 83}%`]
        ]
          .slice(0, full ? 9 : 4)
          .map(([label, value]) => (
            <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
              <p className="font-manrope text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">{label}</p>
              <p className="mt-2 font-mono text-sm font-semibold text-white">{value}</p>
            </div>
          ))}
      </div>
      <p className="mt-4 font-manrope text-sm leading-6 text-text-secondary">
        This proposal reduces but does not eliminate downside risk. It requires your approval before routing.
      </p>
      <PillButton className="mt-5 w-full" icon={<ArrowUpRight className="h-4 w-4" />} onClick={() => router.push('/execution')}>
        Review &amp; Approve
      </PillButton>
    </GlowCard>
  );
}

export default HedgeProposalCard;
