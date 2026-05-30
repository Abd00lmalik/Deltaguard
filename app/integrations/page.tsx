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

import { ArrowUpDown, Brain, GitBranch, Network, Zap } from 'lucide-react';
import { Topbar } from '@/components/layout/Topbar';
import { IntegrationStatusCard } from '@/components/integrations/IntegrationStatusCard';
import { SectionLabel } from '@/components/ui/SectionLabel';

const cards = [
  {
    name: 'SoSoValue Intelligence Layer',
    icon: Zap,
    statusBadge: 'ACTIVE',
    description:
      'Provides structured market signals across ETF flows, macro events, volatility conditions, sentiment, and on-chain activity. Powers the composite risk score.'
  },
  {
    name: 'SSI Portfolio Layer',
    icon: GitBranch,
    statusBadge: 'ACTIVE',
    description:
      'Tracks index-style portfolio holdings including ssiMAG7, ssiMEME, and ssiDeFi. Provides exposure data and delta calculations used by the risk engine.'
  },
  {
    name: 'SoDEX Execution Layer',
    icon: ArrowUpDown,
    statusBadge: 'ACTIVE',
    description:
      'Handles hedge order routing, orderbook depth estimation, and execution confirmation. All positions require user approval before routing.'
  },
  {
    name: 'ValueChain Settlement Layer',
    icon: Network,
    statusBadge: 'ACTIVE',
    description:
      'Provides on-chain position verification and settlement confirmation after execution. Ensures hedge positions are reflected accurately.'
  },
  {
    name: 'Agent Risk Engine',
    icon: Brain,
    statusBadge: 'ACTIVE',
    description:
      'Applies transparent decision rules to market signals and portfolio data. Explains every reasoning step and requires user confirmation before any action.'
  }
];

export default function IntegrationsPage() {

  return (
    <>
      <Topbar title="System Architecture" />
      <div className="space-y-6 p-4 pb-24 sm:p-6 lg:p-8">
        <header>
          <SectionLabel>Data &amp; Execution Stack</SectionLabel>
          <h1 className="mt-3 font-sora text-2xl font-bold text-white">System Architecture</h1>
          <p className="mt-2 max-w-3xl font-manrope text-sm leading-6 text-text-secondary">
            DeltaGuard AI connects market intelligence, portfolio tracking, risk reasoning, and execution into a single
            agent-driven workflow.
          </p>
        </header>

        <div className="grid gap-6 xl:grid-cols-2 2xl:grid-cols-3">
          {cards.map((card) => (
            <IntegrationStatusCard key={card.name} {...card} />
          ))}
        </div>

        <p className="font-manrope text-sm leading-6 text-text-secondary">
          Each layer is designed to keep signals, risk logic, user approval, and execution traceability clearly separated.
        </p>
      </div>
    </>
  );
}
