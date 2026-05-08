'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Topbar } from '@/components/layout/Topbar';
import { DGMetricCard } from '@/components/ui/MetricCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { PillButton } from '@/components/ui/PillButton';
import { RiskScoreGauge } from '@/components/ui/RiskScoreGauge';
import { PortfolioOverview } from '@/components/dashboard/PortfolioOverview';
import { SignalOverview } from '@/components/dashboard/SignalOverview';
import { HedgeProposalCard } from '@/components/agent/HedgeProposalCard';
import { ExecutionTimeline } from '@/components/execution/ExecutionTimeline';
import { MOCK_PENDING_ORDER } from '@/lib/mock/orders';
import { MOCK_COMPOSITE_SCORE } from '@/lib/mock/signals';
import { MOCK_PORTFOLIO_SUMMARY } from '@/lib/mock/portfolio';
import { formatCurrency } from '@/lib/utils/format';
import { slideInRight, staggerContainer, staggerItem } from '@/lib/utils/motion';
import type { AgentReasoningOutput } from '@/types/agent';

const loadingMessages = [
  'Fetching market signals...',
  'Calculating portfolio delta...',
  'Running agent decision engine...',
  'Generating hedge recommendation...'
];

export default function DashboardPage() {
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'complete'>('idle');
  const [agentOutput, setAgentOutput] = useState<AgentReasoningOutput | null>(null);
  const [activeMessage, setActiveMessage] = useState(0);
  const [hedgeActive, setHedgeActive] = useState(false);

  useEffect(() => {
    setHedgeActive(localStorage.getItem('dg-hedge-active') === 'true');
  }, []);

  useEffect(() => {
    if (scanState !== 'scanning') return;
    const interval = window.setInterval(() => {
      setActiveMessage((value) => Math.min(value + 1, loadingMessages.length - 1));
    }, 500);
    return () => window.clearInterval(interval);
  }, [scanState]);

  async function runScan() {
    setScanState('scanning');
    setActiveMessage(0);
    const response = await fetch('/api/agent/scan', { method: 'POST' });
    const data = (await response.json()) as AgentReasoningOutput;
    setAgentOutput(data);
    setScanState('complete');
  }

  const hedgeCoverage = hedgeActive || agentOutput?.decision === 'hedge' ? '35%' : '0%';
  const metricCards = [
    {
      label: 'Portfolio Value',
      value: formatCurrency(MOCK_PORTFOLIO_SUMMARY.totalValueUsd),
      subtext: '6 assets - SSI Portfolio',
      trend: 'up' as const
    },
    {
      label: 'Net Delta Exposure',
      value: MOCK_PORTFOLIO_SUMMARY.netDeltaExposure.toFixed(2),
      subtext: 'Heavily net long',
      highlight: 'danger' as const
    },
    {
      label: 'Composite Signal Score',
      value: String(MOCK_COMPOSITE_SCORE.value),
      subtext: 'RISK-OFF regime - 9 signals',
      trend: 'down' as const,
      highlight: 'danger' as const
    },
    {
      label: 'Hedge Coverage',
      value: hedgeCoverage,
      subtext: hedgeCoverage === '35%' ? 'Hedge proposed or active' : 'No active hedge',
      highlight: hedgeCoverage === '35%' ? ('positive' as const) : ('warning' as const)
    }
  ];

  return (
    <>
      <Topbar
        title="Dashboard"
        action={
          <PillButton loading={scanState === 'scanning'} disabled={scanState === 'scanning'} onClick={runScan}>
            Run Agent Scan
          </PillButton>
        }
      />
      <div className="space-y-6 p-4 pb-24 sm:p-6 lg:p-8">
        <motion.div
          key={scanState === 'complete' ? 'complete-metrics' : 'idle-metrics'}
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          {metricCards.map((card) => (
            <motion.div key={card.label} variants={staggerItem}>
              <DGMetricCard {...card} />
            </motion.div>
          ))}
        </motion.div>

        {scanState === 'scanning' ? (
          <LoadingState messages={loadingMessages} activeIndex={activeMessage} />
        ) : scanState === 'idle' ? (
          <EmptyState
            title="No Scan Running"
            description="Click Run Agent Scan in the top bar to fetch market signals and generate a hedge recommendation."
            action={<PillButton onClick={runScan}>Run Agent Scan</PillButton>}
          />
        ) : (
          <>
            <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
              <PortfolioOverview />
              <RiskScoreGauge score={MOCK_PORTFOLIO_SUMMARY.riskScore} label="HIGH RISK" />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <SignalOverview />
              <motion.div initial="hidden" animate="visible" variants={slideInRight} transition={{ delay: 0.3 }}>
                <HedgeProposalCard output={agentOutput} />
              </motion.div>
            </div>

            <div>
              <ExecutionTimeline steps={MOCK_PENDING_ORDER.timeline} preview />
              <Link
                href="/execution"
                className="mt-4 inline-flex items-center gap-2 font-manrope text-sm font-semibold text-accent-lime hover:text-white"
              >
                View Full Execution Log <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  );
}
