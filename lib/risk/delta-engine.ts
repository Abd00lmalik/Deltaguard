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

import type { PortfolioAsset } from '@/types/portfolio';
import type { MarketSignal } from '@/types/signals';
import { clamp } from '@/lib/utils/format';

export function calculateNetDelta(assets: PortfolioAsset[]): number {
  const directionalAssets = assets.filter((asset) => asset.class !== 'stablecoin');
  const totalValue = directionalAssets.reduce((sum, asset) => sum + (asset.valueUsd ?? 0), 0);
  if (totalValue === 0) return 0;

  const weightedDelta = directionalAssets.reduce((sum, asset) => {
    return sum + asset.delta * (asset.valueUsd ?? 0);
  }, 0);

  return Number((weightedDelta / totalValue).toFixed(2));
}

/**
 * Improved risk score that weights critical/high severity signals more heavily.
 * Returns 0-100 where higher = more risk.
 */
export function calculateRiskScore(signals: MarketSignal[], delta: number): number {
  if (signals.length === 0) return Math.round(delta * 50);

  const SEVERITY_WEIGHT: Record<string, number> = {
    critical: 2.0,
    high:     1.5,
    medium:   1.0,
    low:      0.5,
    positive: 0.3,
  };

  const activeSignals = signals.filter((s) => s.source !== 'unavailable' && s.value !== null);
  if (activeSignals.length === 0) return Math.round(clamp(Math.abs(delta) * 35, 0, 100));

  const { weightedPressure, totalWeight } = activeSignals.reduce(
    (acc, signal) => {
      const sev = SEVERITY_WEIGHT[signal.severity] ?? 1.0;
      const conf = (signal.confidence ?? 100) / 100;
      const pressure = Math.max(0, -signal.score) / 100; // negative score = bearish pressure
      return {
        weightedPressure: acc.weightedPressure + pressure * sev * conf,
        totalWeight: acc.totalWeight + sev * conf,
      };
    },
    { weightedPressure: 0, totalWeight: 0 }
  );

  const signalPressure = totalWeight > 0 ? weightedPressure / totalWeight : 0;
  const deltaRisk = clamp(Math.abs(delta) * 0.4, 0, 0.4);
  return Math.round(clamp((signalPressure * 0.6 + deltaRisk) * 100, 0, 100));
}

/**
 * Computes the recommended hedge notional in USD.
 * Scales with portfolio value, composite score magnitude, and net delta exposure.
 * 
 * Formula:
 *   baseExposure = |compositeScore| / 100  (0-1 scale of market stress)
 *   deltaFactor  = clamp(|netDelta|, 0, 1) (how directional the portfolio is)
 *   hedgeRatio   = baseExposure * 0.5 + deltaFactor * 0.3  (combined 0-0.8)
 *   notional     = portfolioValueUsd * clamp(hedgeRatio, 0.1, 0.6)
 */
export function calculateHedgeSize(
  portfolioValueUsd: number,
  compositeScore: number,
  netDelta: number
): number {
  if (portfolioValueUsd <= 0) return 0;
  const baseExposure = Math.abs(compositeScore) / 100;
  const deltaFactor = clamp(Math.abs(netDelta), 0, 1);
  const hedgeRatio = clamp(baseExposure * 0.5 + deltaFactor * 0.3, 0.1, 0.6);
  return Math.round(portfolioValueUsd * hedgeRatio);
}

/**
 * Extracts current BTC price from the SoSoValue btcSnapshot response.
 * Checks multiple common field name patterns across different API versions.
 * Falls back to a reasonable testnet default if no price data is available.
 */
export function getLiveBtcPrice(btcSnapshot: Record<string, unknown>): number {
  const raw = (btcSnapshot?.data as Record<string, unknown>) ?? btcSnapshot;
  const candidates = [
    raw?.price,
    raw?.current_price,
    raw?.last_price,
    raw?.close,
    raw?.lastPrice,
    raw?.priceUsd,
  ];
  for (const v of candidates) {
    const n = Number(v);
    if (!isNaN(n) && n > 1000) return Math.round(n); // sanity check: BTC > $1000
  }
  // Fallback: testnet uses real market prices, return 0 to signal unavailable
  return 0;
}

