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

import type { AgentCapabilities, AgentMode } from './types';

export type { AgentCapabilities, AgentMode };

export function determineAgentMode(caps: AgentCapabilities): AgentMode {
  const { marketIntelligence, portfolioExposure, executionVenue, signedExecution, accountInitialized } = caps;
  if (marketIntelligence && portfolioExposure && executionVenue && signedExecution && accountInitialized) return "automated_hedging";
  if (marketIntelligence && portfolioExposure) return "advisory_hedge";
  if (marketIntelligence) return "monitoring_only";
  return "manual";
}

export function getExecutionBlockers(caps: AgentCapabilities): string[] {
  const blockers: string[] = [];
  if (!caps.marketIntelligence) blockers.push("SoSoValue market signals unavailable");
  if (!caps.portfolioExposure)  blockers.push("Wallet not connected — connect your wallet on the Portfolio page to enable hedge sizing");
  if (!caps.executionVenue)     blockers.push("SoDEX public market data unavailable");
  if (!caps.signedExecution)    blockers.push("SoDEX signed execution credentials not configured");
  return blockers;
}

export function buildRecommendation(mode: AgentMode, _caps: AgentCapabilities): string {
  switch (mode) {
    case "automated_hedging":
      return "Automated hedging available. Review hedge sizing and approve order submission when ready.";
    case "advisory_hedge":
      return "Advisory hedge available. Market signals and portfolio exposure are resolved. Sizing calculated; signed execution credentials required to submit.";
    case "monitoring_only":
      return "Monitoring only. Market signals are resolved but portfolio exposure is not connected. Connect wallet to enable hedge sizing.";
    case "manual":
      return "Setup required. Connect wallet and enable market signal feeds to calculate hedge sizing.";
    default:
      return "Agent mode unknown.";
  }
}
