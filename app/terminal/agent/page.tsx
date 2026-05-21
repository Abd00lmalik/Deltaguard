'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Check, RefreshCw, X } from 'lucide-react';
import { Topbar } from '@/components/layout/Topbar';
import { AgentReasoningPanel } from '@/components/agent/AgentReasoningPanel';
import { HedgeProposalCard } from '@/components/agent/HedgeProposalCard';
import { DecisionRuleCard } from '@/components/agent/DecisionRuleCard';
import { GlowCard } from '@/components/ui/GlowCard';
import { LoadingState } from '@/components/ui/LoadingState';
import { PillButton } from '@/components/ui/PillButton';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency } from '@/lib/utils/format';
import type { AgentReasoningOutput } from '@/types/agent';

const loadingMessages = [
  'Connecting to SoSoValue API...',
  'Fetching live signals...',
  'Fetching live portfolio from SSI...',
  'Running deterministic decision engine...',
  'Generating live hedge recommendation...'
];

export default function TerminalAgentPage() {
  const router = useRouter();
  const [agentOutput, setAgentOutput] = useState<AgentReasoningOutput | null>(null);
  const [scanError, setScanError] = useState<{ error: string; code?: string; setup?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeMessage, setActiveMessage] = useState(0);

  async function runScan() {
    setLoading(true);
    setScanError(null);
    setAgentOutput(null);
    const interval = window.setInterval(() => {
      setActiveMessage((v) => (v + 1) % loadingMessages.length);
    }, 600);

    try {
      const response = await fetch('/api/terminal/agent/scan', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) {
        setScanError(data);
      } else {
        setAgentOutput(data as AgentReasoningOutput);
      }
    } catch {
      setScanError({ error: 'Network error — could not reach the scan endpoint.' });
    } finally {
      window.clearInterval(interval);
      setLoading(false);
    }
  }

  useEffect(() => {
    void runScan();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Topbar
        title="Agent Reasoning"
        action={
          <PillButton variant="secondary" loading={loading} disabled={loading} onClick={runScan}>
            Re-run Live Scan
          </PillButton>
        }
      />
      <div className="space-y-6 p-4 pb-24 sm:p-6 lg:p-8">
        <header>
          <SectionLabel>AI Decision Engine — Live</SectionLabel>
          <h1 className="mt-3 font-sora text-2xl font-bold text-white">Agent Reasoning</h1>
          <p className="mt-2 max-w-2xl font-manrope text-sm leading-6 text-text-secondary">
            Deterministic TypeScript logic running over live SoSoValue signals and live SSI portfolio data.
          </p>
        </header>

        {loading ? (
          <LoadingState messages={loadingMessages} activeIndex={activeMessage} />
        ) : scanError ? (
          <GlowCard className="border-danger/25 p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
              <div className="flex-1">
                <p className="font-sora text-base font-bold text-white">Live Agent Scan Failed</p>
                <p className="mt-2 font-manrope text-sm text-text-secondary">{scanError.error}</p>
                {scanError.setup && (
                  <p className="mt-3 rounded-xl bg-danger-dim p-3 font-mono text-xs text-danger">
                    Setup required: {scanError.setup}
                  </p>
                )}
                <div className="mt-4 flex gap-3">
                  <PillButton size="sm" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={runScan}>
                    Retry Scan
                  </PillButton>
                  <PillButton size="sm" variant="ghost" onClick={() => router.push('/demo/agent')}>
                    View Demo Mode Instead
                  </PillButton>
                </div>
              </div>
            </div>
          </GlowCard>
        ) : agentOutput ? (
          <>
            <AgentReasoningPanel>
              <h2 className="font-sora text-base font-bold text-white">Live Signal Input Context</h2>
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {[
                  ['Composite Score', String(agentOutput.compositeScore)],
                  ['Portfolio Net Delta', agentOutput.portfolioDelta.toFixed(2)],
                  ['Agent Decision', agentOutput.decision.toUpperCase()],
                  ['Confidence Level', `${agentOutput.confidence}%`],
                  ['Hedge Notional', agentOutput.hedgeRecommendation
                    ? formatCurrency(agentOutput.hedgeRecommendation.notionalUsd)
                    : 'N/A'],
                  ['Requires Confirmation', agentOutput.requiresConfirmation ? 'YES' : 'NO']
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
                    <p className="font-manrope text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">{label}</p>
                    <p className="mt-2 font-sora text-lg font-bold text-white">{value}</p>
                  </div>
                ))}
              </div>
            </AgentReasoningPanel>

            <AgentReasoningPanel>
              <h2 className="font-sora text-base font-bold text-white">Agent Reasoning Trace</h2>
              <div className="mt-5 space-y-3">
                {agentOutput.reasoningSteps.map((step, index) => (
                  <div key={step} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-lime font-mono text-xs font-bold text-black">
                      {index + 1}
                    </div>
                    <p className="flex-1 font-manrope text-sm leading-6 text-white">{step}</p>
                    <Check className="h-4 w-4 shrink-0 text-accent-lime" />
                  </div>
                ))}
              </div>
            </AgentReasoningPanel>

            <AgentReasoningPanel>
              <h2 className="font-sora text-base font-bold text-white">Decision Logic</h2>
              <pre className="mt-5 overflow-x-auto rounded-xl border border-white/[0.06] bg-surface-1 p-5 font-mono text-xs leading-6 text-text-secondary">
{`RULE SET - DeltaGuard AI v1.0 (Deterministic Engine)

IF compositeScore < -50 AND portfolioDelta > 0.5:
    decision   = HEDGE
    vehicle    = highest_beta_asset + '/USDT Perp'
    direction  = SHORT
    notional   = portfolioValue x delta x hedgePercent (0.35)
    leverage   = min(configuredMax, 2)
    confirmation = REQUIRED (autoExecute = FALSE)

ELIF compositeScore >= -50 AND compositeScore <= 20:
    decision   = WATCH
    action     = monitor, no position change

ELIF compositeScore > 20:
    decision   = REDUCE_HEDGE or NO_ACTION
    action     = unwind existing hedge if present`}
              </pre>
            </AgentReasoningPanel>

            <AgentReasoningPanel>
              <h2 className="mb-5 font-sora text-base font-bold text-white">Live Hedge Recommendation</h2>
              <HedgeProposalCard output={agentOutput} full />
            </AgentReasoningPanel>

            <AgentReasoningPanel>
              <h2 className="font-sora text-base font-bold text-white">Rationale</h2>
              <div className="mt-4 space-y-4">
                {agentOutput.reasoningNarrative.map((paragraph) => (
                  <p key={paragraph} className="font-manrope text-sm leading-7 text-text-secondary">
                    {paragraph}
                  </p>
                ))}
              </div>
            </AgentReasoningPanel>

            <AgentReasoningPanel>
              <div className="flex items-center gap-3">
                <h2 className="font-sora text-base font-bold text-white">Risk Warnings</h2>
                <StatusBadge variant="warning" label="Risk Disclosure" />
              </div>
              <div className="mt-5 space-y-3">
                {agentOutput.warnings
                  .concat('Correlation assumptions between BTC and portfolio holdings may break down in extreme market conditions.')
                  .map((warning) => (
                    <div key={warning} className="flex gap-3 rounded-xl bg-warning-dim p-3">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                      <p className="font-manrope text-sm leading-6 text-text-secondary">{warning}</p>
                    </div>
                  ))}
              </div>
            </AgentReasoningPanel>

            <AgentReasoningPanel>
              <h2 className="font-sora text-base font-bold text-white">Agent Constraints</h2>
              <div className="mt-5 space-y-3">
                {agentOutput.refusals.map((refusal) => (
                  <div key={refusal} className="flex gap-3 rounded-xl bg-danger-dim p-3">
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                    <p className="font-manrope text-sm leading-6 text-text-secondary">{refusal}</p>
                  </div>
                ))}
              </div>
            </AgentReasoningPanel>

            <DecisionRuleCard />
          </>
        ) : null}
      </div>
    </>
  );
}
