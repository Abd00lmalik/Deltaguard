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

import { NextResponse } from 'next/server';
import { getSodexAccountState } from '@/lib/providers/live-provider';
import { getOnChainPortfolio } from '@/lib/wallet/portfolio';
import { getDeFiPositions, type DeFiPosition } from '@/lib/wallet/defi-positions';
import { appendPortfolioSnapshot } from '@/lib/storage/portfolio-history';
import { writePortfolioSnapshot } from '@/lib/portfolio/snapshot-writer';
import type { PortfolioAsset } from '@/types/portfolio';
import { mainnet, base, optimism, sepolia } from 'viem/chains';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  const chainIdStr = searchParams.get('chainId');

  if (!address) {
    return NextResponse.json(
      {
        error: 'Wallet address required. Connect your Web3 wallet on the Portfolio page.',
        code: 'CONNECTION_REQUIRED',
      },
      { status: 400 }
    );
  }

  const selectedChainId = chainIdStr ? parseInt(chainIdStr, 10) : sepolia.id;
  const headerApiKey = request.headers.get('x-sodex-api-key') || undefined;

  // Determine which chains to query based on selection
  const chainsToQuery = selectedChainId === mainnet.id
    ? [mainnet.id, base.id, optimism.id]
    : [selectedChainId];

  // Fetch portfolio assets and DeFi positions for each chain in parallel
  const fetchPromises = chainsToQuery.map(async (cid) => {
    const assets = await getOnChainPortfolio(address, cid).catch((e) => {
      console.warn(`[DeltaGuard] Failed to fetch on-chain assets for chain ${cid}:`, e);
      return [] as PortfolioAsset[];
    });
    const defi = await getDeFiPositions(address, cid).catch((e) => {
      console.warn(`[DeltaGuard] Failed to fetch DeFi positions for chain ${cid}:`, e);
      return [] as DeFiPosition[];
    });
    return { assets, defi };
  });

  // Concurrently fetch SoDEX account state and on-chain assets
  const [sodexResult, queryResults] = await Promise.allSettled([
    getSodexAccountState(address, { apiKey: headerApiKey }),
    Promise.all(fetchPromises),
  ]);

  const sodexAccountState = sodexResult.status === 'fulfilled' ? sodexResult.value : null;
  const results = queryResults.status === 'fulfilled' ? queryResults.value : [];

  // Merge results across all queried chains
  const assets: PortfolioAsset[] = [];
  const defiPositions: DeFiPosition[] = [];

  for (const res of results) {
    assets.push(...res.assets);
    defiPositions.push(...res.defi);
  }

  if (sodexResult.status === 'rejected') {
    console.warn('[DeltaGuard] SoDEX account state unavailable:', sodexResult.reason);
  }

  // Compute portfolio totals including DeFi positions
  const spotValueUsd = assets.reduce((s, a) => s + (a.valueUsd ?? 0), 0);
  const defiValueUsd = defiPositions.reduce((s, d) => s + (d.valueUsd ?? 0), 0);
  const totalValueUsd = spotValueUsd + defiValueUsd;

   const directional = assets.filter((a) => a.class !== 'stablecoin');
   const totalDir = directional.reduce((s, a) => s + (a.valueUsd ?? 0), 0);
   const weightedDelta = directional.reduce((s, a) => s + a.delta * (a.valueUsd ?? 0), 0);
   const netDelta = totalDir > 0 ? weightedDelta / totalDir : 0;
 
   // Persist a snapshot for the portfolio history chart (fire-and-forget)
   if (assets.length > 0 || defiPositions.length > 0) {
     void writePortfolioSnapshot(address, totalValueUsd).catch((e) => {
       console.warn('[DeltaGuard] Failed to write database portfolio snapshot:', e);
     });
     void appendPortfolioSnapshot(address, {
       timestamp: new Date().toISOString(),
       valueUsd: totalValueUsd,
       netDelta: Number(netDelta.toFixed(3)),
       assetCount: assets.length + defiPositions.length,
     }).catch((e) => {
       console.warn('[DeltaGuard] Failed to store portfolio snapshot:', e);
     });
   }

  return NextResponse.json({
    sodexAccountState,
    assets,
    defiPositions,
    totalValueUsd,
    netDelta,
    address,
    source: 'on-chain',
    fetchedAt: new Date().toISOString(),
  });
}

export const dynamic = 'force-dynamic';
