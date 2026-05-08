'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MOCK_PORTFOLIO_ASSETS } from '@/lib/mock/portfolio';
import { GlowCard } from '@/components/ui/GlowCard';
import { formatPercent } from '@/lib/utils/format';

export function ExposureChart() {
  return (
    <GlowCard className="p-5">
      <h3 className="font-sora text-base font-bold text-white">Risk Contribution</h3>
      <div className="mt-4 h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={MOCK_PORTFOLIO_ASSETS} layout="vertical" margin={{ left: 8, right: 12 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: '#555', fontSize: 11 }} />
            <YAxis
              dataKey="symbol"
              type="category"
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#8A8A8A', fontSize: 11 }}
              width={74}
            />
            <Tooltip
              contentStyle={{ background: '#0B0B0B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}
              formatter={(value) => [formatPercent(Number(value)), 'Risk Contribution']}
            />
            <Bar
              dataKey="riskContribution"
              radius={[0, 8, 8, 0]}
              fill="#FF4444"
              background={{ fill: 'rgba(255,255,255,0.04)' }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </GlowCard>
  );
}

export default ExposureChart;
