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
