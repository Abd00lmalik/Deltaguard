'use client';

import { useEffect, useState } from 'react';
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
import type { PortfolioSnapshot } from '@/lib/storage/portfolio-history';

interface ChartPoint {
  label: string;
  value: number;
}

function formatSnapshotLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
}

interface Props {
  walletAddress: string | null;
}

export function PortfolioOverview({ walletAddress }: Props) {
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [snapshotCount, setSnapshotCount] = useState(0);

  useEffect(() => {
    if (!walletAddress) {
      setLoading(false);
      return;
    }

    fetch(`/api/terminal/portfolio/history?address=${encodeURIComponent(walletAddress)}`)
      .then((r) => r.json())
      .then((data: { snapshots?: PortfolioSnapshot[] }) => {
        const snaps = data.snapshots ?? [];
        setSnapshotCount(snaps.length);
        setChartData(
          snaps.map((s) => ({
            label: formatSnapshotLabel(s.timestamp),
            value: s.valueUsd,
          }))
        );
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [walletAddress]);

  return (
    <GlowCard className="p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="font-sora text-base font-bold text-white">Portfolio Value History</h3>
          <p className="mt-1 font-manrope text-xs text-text-muted">
            {snapshotCount > 0
              ? `${snapshotCount} real snapshot${snapshotCount > 1 ? 's' : ''} — your actual wallet value over time`
              : 'Recorded each time your portfolio is fetched'}
          </p>
        </div>
        <span className="rounded-lg bg-accent-lime/10 px-2 py-1 font-manrope text-[10px] font-bold uppercase tracking-wider text-accent-lime">
          On-Chain
        </span>
      </div>

      {loading ? (
        <div className="flex h-[230px] items-center justify-center">
          <p className="font-manrope text-sm text-text-muted">Loading history…</p>
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex h-[230px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/[0.015]">
          <p className="font-manrope text-sm font-bold text-white">No history yet</p>
          <p className="max-w-xs text-center font-manrope text-xs leading-5 text-text-muted">
            Your first snapshot was just recorded. Every time you load the Portfolio page, a new
            data point is added here. Come back tomorrow to see your trend.
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={230}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="portfolioLime" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#9CFF00" stopOpacity={0.24} />
                <stop offset="95%" stopColor="#9CFF00" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#555', fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={formatCompactCurrency}
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#555', fontSize: 11 }}
              width={72}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{ background: '#0B0B0B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}
              labelStyle={{ color: '#8A8A8A', fontSize: 11 }}
              formatter={(value) => [formatCompactCurrency(Number(value)), 'Portfolio Value']}
            />
            <Area type="monotone" dataKey="value" stroke="#9CFF00" strokeWidth={2.5} fill="url(#portfolioLime)" dot={{ r: 3, fill: '#9CFF00', strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </GlowCard>
  );
}

export default PortfolioOverview;
