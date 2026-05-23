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

/**
 * TERMINAL ROUTE — LIVE DATA ONLY
 * Returns real external API data or honest error states.
 * Does not fall back to mock data silently.
 * 
 * Intelligence sources (all parallel):
 *   - SoSoValue: ETF flows, index snapshots, news regime
 *   - Binance Premium Index: BTC/ETH perpetual funding rates
 *   - Deribit: DVOL implied volatility index + options put/call skew
 *   - Hyperliquid: Orderbook bid/ask imbalance + OI-weighted funding
 */

import { NextResponse } from 'next/server';
import { getSoSoValueData } from '@/lib/integrations/sosovalue/provider';
import { normalizeSoSoValueData } from '@/lib/integrations/sosovalue/normalizer';
import { calculateCompositeScore } from '@/lib/integrations/sosovalue/server-client';
import { fetchBtcEthFundingRates } from '@/lib/integrations/coinglass/client';
import { fetchDeribitIntelligence } from '@/lib/integrations/deribit/client';
import { fetchHyperliquidIntelligence } from '@/lib/integrations/hyperliquid/client';
import { parseRiskProfile } from '@/lib/config/signal-weights';
import { withTelemetry } from '@/lib/telemetry/middleware';
import type { SignalMetadata } from '@/lib/types/signal-source';
import type { MarketSignal } from '@/types/signals';

async function handler(request: Request) {
  const riskProfile = parseRiskProfile(
    new URL(request.url).searchParams.get('profile') ??
    request.headers.get('x-risk-profile')
  );

  const [sosoData, fundingRates, deribitData, hyperliquidData] = await Promise.all([
    getSoSoValueData(),
    fetchBtcEthFundingRates().catch((err) => {
      console.warn('Failed to fetch funding rates in signals api:', err);
      return undefined;
    }),
    fetchDeribitIntelligence().catch((err) => {
      console.warn('Failed to fetch Deribit intelligence:', err);
      return undefined;
    }),
    fetchHyperliquidIntelligence().catch((err) => {
      console.warn('Failed to fetch Hyperliquid intelligence:', err);
      return undefined;
    }),
  ]);

  if (!sosoData.available && sosoData.providerHealth === 'setup_required') {
    return NextResponse.json(
      {
        error: 'SoSoValue credentials not configured',
        code: 'SOSOVALUE_NOT_CONFIGURED',
        setup: 'Set SOSOVALUE_API_KEY and SOSOVALUE_BASE_URL in your environment.',
        metadata: {
          source: 'unavailable',
          providerHealth: 'setup_required',
          dataSourcesUsed: [],
          lastUpdated: sosoData.lastUpdated,
          errors: sosoData.errors,
        } satisfies SignalMetadata,
      },
      { status: 503 }
    );
  }

  const signals = normalizeSoSoValueData(
    sosoData,
    null,
    fundingRates || undefined,
    deribitData || undefined,
    hyperliquidData || undefined,
    riskProfile
  );
  const compositeScore = calculateCompositeScore(signals, riskProfile);

  const unavailableCount = signals.filter((s: MarketSignal) => s.source === 'unavailable' || s.value === null).length;
  const availableCount = signals.length - unavailableCount;

  // Build data sources list
  const dataSourcesUsed: string[] = [
    sosoData.newsList?.length > 0 ? 'SoSoValue /news' : null,
    sosoData.indexSnapshot && Object.keys(sosoData.indexSnapshot).length > 0 ? 'SoSoValue /indices/ssimag7/market-snapshot' : null,
    sosoData.btcSnapshot && Object.keys(sosoData.btcSnapshot).length > 0 ? 'SoSoValue BTC snapshot' : null,
    fundingRates ? 'Binance Premium Index (BTC/ETH perp funding)' : null,
    deribitData?.source === 'live' ? `Deribit DVOL (BTC: ${deribitData.btcVol?.dvolIndex}, ETH: ${deribitData.ethVol?.dvolIndex})` : null,
    hyperliquidData?.source === 'live' ? `Hyperliquid orderbook (BTC imbalance: ${hyperliquidData.btcOrderbook?.imbalanceRatio?.toFixed(3)})` : null,
  ].filter(Boolean) as string[];

  const metadata: SignalMetadata = {
    source: sosoData.source,
    providerHealth: sosoData.providerHealth,
    dataSourcesUsed,
    lastUpdated: sosoData.lastUpdated,
    errors: sosoData.errors,
    ...(sosoData.source === 'cached' ? { cacheAgeSeconds: sosoData.cacheAgeSeconds } : {}),
  };

  if (!sosoData.available) {
    return NextResponse.json(
      {
        error: sosoData.errors[0]?.message ?? 'SoSoValue API unreachable',
        code: 'SOSOVALUE_FETCH_FAILED',
        signals: [],
        compositeScore: null,
        metadata,
      },
      { status: 502 }
    );
  }

  let compositeLabel = 'UNAVAILABLE';
  let compositeRegime: 'risk-off' | 'caution' | 'neutral' | 'risk-on' = 'neutral';
  if (compositeScore !== null) {
    if (compositeScore < -50) { compositeLabel = 'RISK-OFF'; compositeRegime = 'risk-off'; }
    else if (compositeScore <= 20) { compositeLabel = 'CAUTION'; compositeRegime = 'caution'; }
    else { compositeLabel = 'RISK-ON'; compositeRegime = 'risk-on'; }
  }

  return NextResponse.json({
    signals,
    composite: {
      value: compositeScore,
      label: compositeLabel,
      regime: compositeRegime,
      lastUpdated: sosoData.lastUpdated,
    },
    metadata,
    intelligence: {
      deribit: {
        btcDvol: deribitData?.btcVol ?? null,
        ethDvol: deribitData?.ethVol ?? null,
        btcSkew: deribitData?.btcSkew ?? null,
        ethSkew: deribitData?.ethSkew ?? null,
        source: deribitData?.source ?? 'unavailable',
      },
      hyperliquid: {
        btcFunding: hyperliquidData?.btcFunding ?? null,
        ethFunding: hyperliquidData?.ethFunding ?? null,
        btcOrderbook: hyperliquidData?.btcOrderbook ?? null,
        ethOrderbook: hyperliquidData?.ethOrderbook ?? null,
        source: hyperliquidData?.source ?? 'unavailable',
      },
      riskProfile,
    },
    summary: {
      total: signals.length,
      available: availableCount,
      unavailable: unavailableCount,
    },
    fetchedAt: sosoData.lastUpdated,
  });
}

export const GET = withTelemetry('/api/terminal/signals', handler);
export const dynamic = 'force-dynamic';
