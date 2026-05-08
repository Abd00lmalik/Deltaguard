'use client';

import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, ArrowUpRight } from 'lucide-react';
import { GlowCard } from '@/components/ui/GlowCard';
import { PillButton } from '@/components/ui/PillButton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { MOCK_PENDING_ORDER } from '@/lib/mock/orders';
import { formatCurrency } from '@/lib/utils/format';

interface OrderTicketProps {
  executing: boolean;
  complete: boolean;
  onApprove: () => void;
}

export function OrderTicket({ executing, complete, onApprove }: OrderTicketProps) {
  const router = useRouter();

  return (
    <GlowCard className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-sora text-lg font-bold text-white">Hedge Order</h3>
          <p className="mt-1 font-manrope text-xs text-text-muted">Created by deterministic agent engine</p>
        </div>
        <StatusBadge variant={complete ? 'hedge' : 'warning'} label={complete ? 'Filled' : 'Pending Approval'} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          ['Pair', MOCK_PENDING_ORDER.pair],
          ['Direction', MOCK_PENDING_ORDER.direction.toUpperCase()],
          ['Leverage', `${MOCK_PENDING_ORDER.leverage}x`],
          ['Estimated Entry', formatCurrency(MOCK_PENDING_ORDER.estimatedPrice)],
          ['Hedge Notional', formatCurrency(MOCK_PENDING_ORDER.notionalUsd)],
          ['Slippage Est.', `${MOCK_PENDING_ORDER.slippageEstimate}%`],
          ['Venue', 'SoDEX'],
          ['Confidence', '83%']
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
            <p className="font-manrope text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">{label}</p>
            <p className="mt-2 font-mono text-sm font-semibold text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-2">
        {[
          "Review the agent's reasoning before approving this action.",
          'Risk controls are applied. Leverage and size follow your configured limits.',
          'You can cancel this proposal at any time before approving.'
        ].map((warning) => (
          <div key={warning} className="flex gap-2 rounded-xl border border-warning/15 bg-warning-dim px-3 py-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <p className="font-manrope text-xs leading-5 text-text-secondary">{warning}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <PillButton
          variant="ghost"
          className="sm:w-auto"
          icon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => router.push('/agent')}
        >
          Review Agent Reasoning
        </PillButton>
        <PillButton
          className="flex-1"
          loading={executing}
          disabled={complete}
          icon={<ArrowUpRight className="h-4 w-4" />}
          onClick={onApprove}
        >
          {complete ? 'Hedge Approved' : 'Approve Hedge'}
        </PillButton>
      </div>
    </GlowCard>
  );
}

export default OrderTicket;
