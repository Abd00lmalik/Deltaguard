'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { GlowCard } from '@/components/ui/GlowCard';
import { formatCompactCurrency } from '@/lib/utils/format';

interface BeforeAfterChartProps {
  data: { time: string; unhedged: number; hedged: number }[];
  title?: string;
  className?: string;
}

export function BeforeAfterChart({ data, title = 'Portfolio Value Over Time', className }: BeforeAfterChartProps) {
  return (
    <GlowCard className={className ?? 'p-5'}>
      <h3 className="font-sora text-base font-bold text-white">{title}</h3>
      <div className="mt-5 h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorUnhedged" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#FF4444" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorHedged" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#9CFF00" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#9CFF00" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fill: '#555', fontSize: 11 }} />
            <YAxis
              tickFormatter={formatCompactCurrency}
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#555', fontSize: 11 }}
              width={72}
            />
            <Tooltip
              contentStyle={{ background: '#0B0B0B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}
              formatter={(value) => [formatCompactCurrency(Number(value)), '']}
            />
            <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ color: '#8A8A8A', fontSize: 12 }} />
            <ReferenceLine
              x="T+4"
              stroke="rgba(255,255,255,0.22)"
              strokeDasharray="4 4"
              label={{ value: 'CRASH EVENT', fill: '#8A8A8A', fontSize: 11 }}
            />
            <Area
              type="monotone"
              name="Exposure Without Hedge"
              dataKey="unhedged"
              stroke="#FF4444"
              strokeWidth={2}
              fill="url(#colorUnhedged)"
              isAnimationActive
            />
            <Area
              type="monotone"
              name="Protection With Hedge"
              dataKey="hedged"
              stroke="#9CFF00"
              strokeWidth={2}
              fill="url(#colorHedged)"
              isAnimationActive
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </GlowCard>
  );
}

export default BeforeAfterChart;
