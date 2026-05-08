import { CheckCircle2 } from 'lucide-react';
import { GlowCard } from '@/components/ui/GlowCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { MOCK_PENDING_ORDER } from '@/lib/mock/orders';
import { formatCurrency } from '@/lib/utils/format';

interface SimulatedReceiptProps {
  filledPrice: number;
  filledAt: string;
}

export function SimulatedReceipt({ filledPrice, filledAt }: SimulatedReceiptProps) {
  return (
    <GlowCard glowing className="mt-5 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-accent-lime glow-lime" />
          <h3 className="font-sora text-lg font-bold text-white">Order Filled</h3>
        </div>
        <StatusBadge variant="hedge" label="Filled" />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          ['Order ID', MOCK_PENDING_ORDER.id.toUpperCase()],
          ['Filled Price', formatCurrency(filledPrice)],
          ['Fill Time', new Date(filledAt).toLocaleString()],
          ['Slippage Applied', '0.02%'],
          ['Venue', 'SoDEX'],
          ['Hedge Notional', formatCurrency(MOCK_PENDING_ORDER.notionalUsd)],
          ['Hedge Active', 'YES'],
          ['Protection Coverage', '~35% of net long exposure']
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
            <p className="font-manrope text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">{label}</p>
            <p className="mt-2 font-mono text-sm font-semibold text-white">{value}</p>
          </div>
        ))}
      </div>
      <p className="mt-5 font-manrope text-xs leading-5 text-text-muted">
        Order routed through SoDEX. Hedge position is now active.
      </p>
    </GlowCard>
  );
}

export default SimulatedReceipt;
