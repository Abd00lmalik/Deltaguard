'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { GlowCard } from '@/components/ui/GlowCard';
import { formatCompactCurrency } from '@/lib/utils/format';

const data = Array.from({ length: 30 }, (_, index) => {
  const dip = index < 16 ? index * 820 : 16 * 820 - (index - 15) * 480;
  const jitter = Math.sin(index / 2) * 1150;
  return {
    day: `D${index + 1}`,
    value: Math.round(126200 - dip + jitter)
  };
});

export function PortfolioOverview() {
  return (
    <GlowCard className="p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="font-sora text-base font-bold text-white">Portfolio Value Path</h3>
          <p className="mt-1 font-manrope text-xs text-text-muted">30-day path, drawdown and partial recovery</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={230}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="portfolioLime" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#9CFF00" stopOpacity={0.24} />
              <stop offset="95%" stopColor="#9CFF00" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: '#555', fontSize: 11 }} />
          <YAxis
            tickFormatter={formatCompactCurrency}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#555', fontSize: 11 }}
            width={70}
          />
          <Tooltip
            contentStyle={{ background: '#0B0B0B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}
            labelStyle={{ color: '#8A8A8A' }}
            formatter={(value) => [formatCompactCurrency(Number(value)), 'Portfolio']}
          />
          <Area type="monotone" dataKey="value" stroke="#9CFF00" strokeWidth={2.5} fill="url(#portfolioLime)" />
        </AreaChart>
      </ResponsiveContainer>
    </GlowCard>
  );
}

export default PortfolioOverview;
