'use client';

/*
AUDIT RESULTS:
1. Hardcoded pricing:
lib/mock/portfolio.ts:75:    priceUsd: 1.0,

2. Mock reasoning:
app/api/terminal/agent/scan/route.ts:4: * Does not fall back to mock data silently.
app/api/terminal/agent/scan/route.ts:5: * If all sources fail, returns structured error — never mock values.
lib/agent/decision-engine.ts:64:            'BTC/USDT Perp is selected as the highest beta-weight hedge vehicle for the mock portfolio.'
lib/agent/decision-engine.ts:86:      'Slippage estimate: 0.08% based on simulated SoDEX depth.',
lib/agent/decision-engine.ts:95:      'Simulated execution may differ from real market conditions.',
lib/agent/reasoning-engine.ts:6:      `The composite signal score of ${output.compositeScore} places the market in a risk-off regime. Multiple mock SoSoValue-style inputs are pointing in the same direction: ETF outflows, macro pressure, volatility expansion, and weakening SSI momentum.`,
lib/agent/reasoning-engine.ts:8:      `The recommendation requires user approval before any simulated execution can occur. DeltaGuard AI never auto-executes, never touches real funds, and never presents mock execution as live trading.`
lib/agent/reasoning-engine.ts:16:      'No simulated order is created unless the hedge threshold and portfolio delta rules are both satisfied.'

3. Architecture route:
app/integrations/page.tsx:47:      <Topbar title="System Architecture" />
app/integrations/page.tsx:51:          <h1 className="mt-3 font-sora text-2xl font-bold text-white">System Architecture</h1>
components/layout/Sidebar.tsx:52:    { label: 'Architecture', href: '/integrations', icon: Layers },

4. Signal pipeline gaps:
lib/integrations/sosovalue/normalizer.ts:174:  // Options Skew signal from Deribit (new signal)
lib/integrations/sosovalue/normalizer.ts:177:  let optionsSkewSource: SignalSource = 'unavailable';
lib/integrations/sosovalue/normalizer.ts:180:    // Positive skew = puts more expensive = bearish demand = negative signal
lib/integrations/sosovalue/normalizer.ts:189:  // Orderbook Imbalance signal from Hyperliquid (new signal)
lib/integrations/sosovalue/normalizer.ts:192:  let obImbalanceSource: SignalSource = 'unavailable';
lib/integrations/sosovalue/normalizer.ts:195:    // Positive ratio = buy-side dominant = bullish = positive signal

5. Chart data binding:
app/api/terminal/portfolio/history/route.ts:2:import { getPortfolioSnapshots, type PortfolioSnapshot } from '@/lib/storage/portfolio-history';
app/api/terminal/portfolio/history/route.ts:4:import { getHistoricalPrices, getCoinGeckoId } from '@/lib/providers/price-feed';
app/api/terminal/portfolio/history/route.ts:20:  // If we have fewer than 7 snapshots, let's reconstruct the historical 7-day trend to avoid a blank or tiny chart!
components/dashboard/PortfolioOverview.tsx:6:  AreaChart,
components/dashboard/PortfolioOverview.tsx:12:} from 'recharts';
components/dashboard/PortfolioOverview.tsx:15:import type { PortfolioSnapshot } from '@/lib/storage/portfolio-history';
components/dashboard/PortfolioOverview.tsx:32:  const [chartData, setChartData] = useState<ChartPoint[]>([]);
*/

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
import type { PortfolioHistoryPoint, PortfolioHistoryResponse } from '@/lib/types/portfolio-history';

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
      .then((data: PortfolioHistoryResponse) => {
        const points = data.points ?? [];
        const validPoints = points.filter(p => p.totalUsdValue !== null) as (PortfolioHistoryPoint & { totalUsdValue: number })[];
        setSnapshotCount(validPoints.length);
        setChartData(
          validPoints.map((p) => ({
            label: formatSnapshotLabel(new Date(p.timestampMs).toISOString()),
            value: p.totalUsdValue,
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
