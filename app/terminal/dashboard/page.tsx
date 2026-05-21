'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowUpRight, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { Topbar } from '@/components/layout/Topbar';
import { DGMetricCard } from '@/components/ui/MetricCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { PillButton } from '@/components/ui/PillButton';
import { GlowCard } from '@/components/ui/GlowCard';
import { RiskScoreGauge } from '@/components/ui/RiskScoreGauge';
import { PortfolioOverview } from '@/components/dashboard/PortfolioOverview';
import { SignalOverview } from '@/components/dashboard/SignalOverview';
import { HedgeProposalCard } from '@/components/agent/HedgeProposalCard';
import { formatCurrency } from '@/lib/utils/format';
import { staggerContainer, staggerItem, slideInRight } from '@/lib/utils/motion';
import type { AgentReasoningOutput } from '@/types/agent';

const loadingMessages = [
  'Connecting to SoSoValue API...',
  'Fetching live market signals...',
  'Calculating live portfolio delta...',
  'Running agent decision engine...',
  'Generating hedge recommendation...'
];

interface ScanError { error: string; code?: string; setup?: string }

interface AssetData {
  valueUsd: number;
  class: string;
  delta: number;
}

export default function TerminalDashboardPage() {
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'complete' | 'error'>('idle');
  const [agentOutput, setAgentOutput] = useState<AgentReasoningOutput | null>(null);
  const [scanError, setScanError] = useState<ScanError | null>(null);
  const [activeMessage, setActiveMessage] = useState(0);
  const [portfolioValue, setPortfolioValue] = useState<number | null>(null);
  const [netDelta, setNetDelta] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/terminal/portfolio')
      .then((r) => r.json())
      .then((data: { assets?: AssetData[] }) => {
        if (data?.assets) {
          const total = data.assets.reduce((s: number, a: AssetData) => s + a.valueUsd, 0);
          const directional = data.assets.filter((a: AssetData) => a.class !== 'stablecoin');
          const totalDir = directional.reduce((s: number, a: AssetData) => s + a.valueUsd, 0);
          const wDelta = directional.reduce((s: number, a: AssetData) => s + a.delta * a.valueUsd, 0);
          setPortfolioValue(total);
          setNetDelta(totalDir > 0 ? wDelta / totalDir : 0);
        }
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (scanState !== 'scanning') return;
    const interval = window.setInterval(() => {
      setActiveMessage((v) => Math.min(v + 1, loadingMessages.length - 1));
    }, 600);
    return () => window.clearInterval(interval);
  }, [scanState]);

  async function runScan() {
    const isConnected = typeof window !== 'undefined' && localStorage.getItem('dg_wallet_connected') === 'true';
    const walletAddr = typeof window !== 'undefined' ? localStorage.getItem('dg_wallet_address') || '' : '';

    if (!isConnected || !walletAddr) {
      setScanError({
        error: 'Web3 wallet connection required. Please connect your wallet on the Portfolio page to enable scans.',
        code: 'CONNECTION_REQUIRED'
      });
      setScanState('error');
      return;
    }

    setScanState('scanning');
    setScanError(null);
    setActiveMessage(0);
    try {
      const response = await fetch('/api/terminal/agent/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: walletAddr })
      });
      const data = await response.json();
      if (!response.ok) {
        setScanError(data as ScanError);
        setScanState('error');
        return;
      }
      setAgentOutput(data as AgentReasoningOutput);
      setScanState('complete');
    } catch {
      setScanError({ error: 'Network error — could not reach scan endpoint.' });
      setScanState('error');
    }
  }

  const metricCards = [
    {
      label: 'Portfolio Value',
      value: portfolioValue != null ? formatCurrency(portfolioValue) : '—',
      subtext: portfolioValue != null ? 'Live SSI Portfolio' : 'Awaiting live data',
      trend: 'up' as const
    },
    {
      label: 'Net Delta Exposure',
      value: netDelta != null ? netDelta.toFixed(2) : '—',
      subtext: netDelta != null ? 'Live delta' : 'Awaiting live data',
      highlight: 'danger' as const
    },
    {
      label: 'Composite Signal Score',
      value: agentOutput?.compositeScore != null ? String(agentOutput.compositeScore) : '—',
      subtext: agentOutput?.decision ? `${agentOutput.decision.toUpperCase()} regime` : 'Run scan to fetch',
      trend: 'down' as const,
      highlight: 'danger' as const
    },
    {
      label: 'Agent Decision',
      value: agentOutput?.decision ? agentOutput.decision.toUpperCase() : '—',
      subtext: agentOutput?.confidence != null ? `Confidence: ${agentOutput.confidence}%` : 'Run scan to fetch',
      highlight: agentOutput?.decision === 'hedge' ? ('positive' as const) : ('warning' as const)
    }
  ];

  return (
    <>
      <Topbar
        title="Dashboard"
        action={
          <PillButton loading={scanState === 'scanning'} disabled={scanState === 'scanning'} onClick={runScan}>
            Run Live Scan
          </PillButton>
        }
      />
      <div className="space-y-6 p-4 pb-24 sm:p-6 lg:p-8">
        <motion.div
          key={scanState}
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
        ) : scanState === 'error' && scanError ? (
          <GlowCard className="border-danger/25 p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
              <div className="flex-1">
                <p className="font-sora text-base font-bold text-white">Live Scan Failed</p>
                <p className="mt-2 font-manrope text-sm text-text-secondary">{scanError.error}</p>
                {scanError.setup && (
                  <p className="mt-3 rounded-xl bg-danger-dim p-3 font-mono text-xs text-danger">
                    Setup required: {scanError.setup}
                  </p>
                )}
                <div className="mt-4 flex gap-3">
                  {scanError.code === 'CONNECTION_REQUIRED' ? (
                    <Link
                      href="/terminal/portfolio"
                      className="inline-flex items-center gap-2 rounded-xl bg-accent-lime px-4 py-2.5 font-manrope text-sm font-semibold text-neutral-950 transition-colors hover:bg-accent-lime/90"
                    >
                      Connect Wallet
                    </Link>
                  ) : (
                    <PillButton size="sm" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={runScan}>
                      Retry Scan
                    </PillButton>
                  )}
                </div>
              </div>
            </div>
          </GlowCard>
        ) : scanState === 'idle' ? (
          <EmptyState
            title="Live Terminal Ready"
            description="Click Run Live Scan to connect to SoSoValue, fetch live market signals, and run the agent decision engine."
            action={<PillButton onClick={runScan}>Run Live Scan</PillButton>}
          />
        ) : (
          <>
            <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
              <PortfolioOverview />
              <RiskScoreGauge score={agentOutput ? Math.round(Math.abs(agentOutput.compositeScore) * 0.8) : 0} label="LIVE RISK" />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <SignalOverview />
              <motion.div initial="hidden" animate="visible" variants={slideInRight} transition={{ delay: 0.3 }}>
                <HedgeProposalCard output={agentOutput} />
              </motion.div>
            </div>

            <div className="rounded-2xl border border-accent-lime/10 bg-accent-lime/[0.03] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-manrope text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">Live Execution Console</p>
                  <p className="mt-1 font-sora text-sm font-bold text-white">Order Queue</p>
                  <p className="mt-1.5 font-manrope text-xs leading-5 text-text-secondary">
                    Prepared hedge orders awaiting approval are staged in the execution console.
                    Run a scan with portfolio exposure to generate a real order ticket.
                  </p>
                </div>
                <Link
                  href="/terminal/execution"
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-accent-lime-dim px-4 py-2.5 font-manrope text-sm font-semibold text-accent-lime transition-colors hover:bg-accent-lime/10"
                >
                  Open Console <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
