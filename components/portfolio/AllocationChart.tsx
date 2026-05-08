'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { MOCK_PORTFOLIO_ASSETS } from '@/lib/mock/portfolio';
import { GlowCard } from '@/components/ui/GlowCard';
import { formatPercent } from '@/lib/utils/format';

const colors: Record<string, string> = {
  BTC: 'rgba(247,147,26,0.6)',
  ETH: 'rgba(98,126,234,0.6)',
  ssiMAG7: '#9CFF00',
  ssiMEME: 'rgba(255,107,53,0.65)',
  ssiDeFi: 'rgba(107,156,255,0.65)',
  USDC: '#2A7A4B'
};

export function AllocationChart() {
  return (
    <GlowCard className="p-5">
      <h3 className="font-sora text-base font-bold text-white">Allocation</h3>
      <div className="mt-4 h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={MOCK_PORTFOLIO_ASSETS}
              dataKey="allocation"
              nameKey="symbol"
              innerRadius={68}
              outerRadius={104}
              paddingAngle={2}
            >
              {MOCK_PORTFOLIO_ASSETS.map((asset) => (
                <Cell key={asset.id} fill={colors[asset.symbol]} stroke="rgba(0,0,0,0.35)" />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: '#0B0B0B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}
              formatter={(value) => [formatPercent(Number(value)), 'Allocation']}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {MOCK_PORTFOLIO_ASSETS.map((asset) => (
          <div key={asset.id} className="flex items-center gap-2 font-manrope text-xs text-text-secondary">
            <span className="h-2 w-2 rounded-full" style={{ background: colors[asset.symbol] }} />
            {asset.symbol} {formatPercent(asset.allocation)}
          </div>
        ))}
      </div>
    </GlowCard>
  );
}

export default AllocationChart;
