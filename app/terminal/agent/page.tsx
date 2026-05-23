'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { useNetwork } from '@/lib/store/network-context';
import { AlertTriangle, Check, CheckCircle, RefreshCw, X, XCircle, Activity, Database, TrendingUp, Shield } from 'lucide-react';
import { Topbar } from '@/components/layout/Topbar';
import { AgentReasoningPanel } from '@/components/agent/AgentReasoningPanel';
import { HedgeProposalCard } from '@/components/agent/HedgeProposalCard';
import { DecisionRuleCard } from '@/components/agent/DecisionRuleCard';
import { GlowCard } from '@/components/ui/GlowCard';
import { LoadingState } from '@/components/ui/LoadingState';
import { PillButton } from '@/components/ui/PillButton';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { AgentReasoningOutput } from '@/types/agent';
import type { AgentCapabilities, AgentMode } from '@/lib/agent/capabilities';
import type { SSIResult } from '@/lib/integrations/ssi/server-client';
import type { MarketSignal } from '@/types/signals';

const MODE_LABELS: Record<AgentMode, { label: string; color: string }> = {
  full:                { label: 'Full Analysis',         color: 'text-accent-lime' },
  execution_prep:      { label: 'Execution Prep',        color: 'text-accent-lime' },
  market_intelligence: { label: 'Market Intelligence',   color: 'text-amber-400' },
  market_and_execution:{ label: 'Market + Execution',    color: 'text-amber-400' },
  portfolio_only:      { label: 'Portfolio Only',        color: 'text-amber-400' },
  degraded:            { label: 'Degraded',              color: 'text-red-400' },
  setup_required:      { label: 'Setup Required',        color: 'text-neutral-500' },
};

const loadingMessages = [
  'Connecting to SoSoValue API...',
  'Fetching live market signals...',
  'Checking portfolio exposure...',
  'Running deterministic decision engine...',
  'Generating hedge recommendation...'
];

interface ScanData extends AgentReasoningOutput {
  mode?: AgentMode;
  capabilities?: AgentCapabilities;
  blockers?: string[];
  recommendation?: string;
  signalSource?: string;
  errors?: string[];
  portfolioExposure?: SSIResult | null;
  signals?: MarketSignal[];
}

export default function TerminalAgentPage() {
  const router = useRouter();
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();
  const { activeChainId } = useNetwork();

  const [scanData, setScanData] = useState<ScanData | null>(null);
  const [scanError, setScanError] = useState<{ error: string; code?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeMessage, setActiveMessage] = useState(0);
  const [watchAddress, setWatchAddress] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWatchAddress(localStorage.getItem('dg_watch_address') || '');
    }
  }, []);

  const walletAddress = wagmiConnected && wagmiAddress
    ? wagmiAddress.toLowerCase()
    : watchAddress || '';

  const runScan = useCallback(async (overrideAddress?: string) => {
    const activeAddr = overrideAddress || walletAddress;
    if (!activeAddr) {
      setScanError({
        error: 'Web3 wallet connection required. Please connect your wallet on the Portfolio page to enable scans.',
        code: 'CONNECTION_REQUIRED'
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    setScanError(null);
    setScanData(null);
    const interval = window.setInterval(() => {
      setActiveMessage((v) => (v + 1) % loadingMessages.length);
    }, 600);

    try {
      const riskProfile = localStorage.getItem('dg_risk_profile') || 'balanced';
      
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const customApiKey = localStorage.getItem('dg_sodex_api_key');
      const customApiSecret = localStorage.getItem('dg_sodex_api_private_key');
      if (customApiKey) headers['x-sodex-api-key'] = customApiKey;
      if (customApiSecret) headers['x-sodex-api-private-key'] = customApiSecret;

      const response = await fetch('/api/terminal/agent/scan', {
        method: 'POST',
        headers,
        body: JSON.stringify({ walletAddress: activeAddr, chainId: activeChainId, riskProfile }),
      });
      const data = await response.json();
      if (!response.ok) {
        setScanError(data);
      } else {
        setScanData(data as ScanData);
      }
    } catch {
      setScanError({ error: 'Network error — could not reach the scan endpoint.' });
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  }, [walletAddress, activeChainId]);

  // Trigger scan when address or chainId changes
  useEffect(() => {
    if (walletAddress) {
      void runScan(walletAddress);
    } else {
      setLoading(false);
    }
  }, [walletAddress, activeChainId, runScan]);

  const mode    = scanData?.mode    ?? 'setup_required';
  const caps    = scanData?.capabilities;
  const modeInfo = MODE_LABELS[mode as AgentMode] ?? MODE_LABELS.degraded;

  return (
    <>
      <Topbar
        title="Agent Analysis"
        action={
          <PillButton
            size="sm"
            variant="secondary"
            icon={<RefreshCw className="h-3.5 w-3.5" />}
            onClick={() => runScan()}
            loading={loading}
          >
            Re-scan
          </PillButton>
        }
      />

      <div className="space-y-6 p-4 pb-24 sm:p-6 lg:p-8">
        <header>
          <SectionLabel>DeltaGuard Agent</SectionLabel>
          <h1 className="mt-3 font-sora text-2xl font-bold text-white">Live Agent Analysis</h1>
          <p className="mt-2 max-w-2xl font-manrope text-sm leading-6 text-text-secondary">
            Deterministic hedge decision engine analyzing live market signals and portfolio exposure.
          </p>
        </header>

        {loading ? (
          <LoadingState messages={loadingMessages} activeIndex={activeMessage} />
        ) : scanError ? (
          <GlowCard className="border-danger/25 p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
              <div>
                <p className="font-sora text-base font-bold text-white">Scan Failed</p>
                <p className="mt-2 font-manrope text-sm text-text-secondary">{scanError.error}</p>
                <div className="mt-4 flex gap-3">
                  {scanError.code === 'CONNECTION_REQUIRED' ? (
                    <Link
                      href="/terminal/portfolio"
                      className="inline-flex items-center gap-2 rounded-xl bg-accent-lime px-4 py-2.5 font-manrope text-sm font-semibold text-neutral-950 transition-colors hover:bg-accent-lime/90"
                    >
                      Connect Wallet
                    </Link>
                  ) : (
                    <PillButton size="sm" onClick={() => runScan()}>Retry</PillButton>
                  )}
                </div>
              </div>
            </div>
          </GlowCard>
        ) : scanData ? (
          <>
            {/* Agent Mode Header */}
            <GlowCard className="p-5 border-white/[0.04] bg-neutral-900/40">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="font-manrope text-xs text-text-muted uppercase tracking-widest">Agent Mode</span>
                  <h2 className={`mt-1 font-sora text-xl font-bold ${modeInfo.color}`}>{modeInfo.label}</h2>
                  {scanData.recommendation && (
                    <p className="mt-2 max-w-2xl font-manrope text-sm leading-6 text-text-secondary">
                      {scanData.recommendation}
                    </p>
                  )}
                </div>
                <StatusBadge
                  variant={mode === 'full' || mode === 'execution_prep' ? 'safe' : mode === 'setup_required' ? 'danger' : 'warning'}
                  label={modeInfo.label}
                />
              </div>
            </GlowCard>

            {/* Capability Grid */}
            {caps && (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {([
                  { label: 'Market Intelligence', key: 'marketIntelligence', icon: TrendingUp,  action: '/terminal/signals' },
                  { label: 'Portfolio Exposure',  key: 'portfolioExposure',  icon: Database,    action: '/terminal/portfolio' },
                  { label: 'Execution Venue',     key: 'executionVenue',     icon: Activity,    action: '/terminal/execution' },
                  { label: 'Signed Execution',    key: 'signedExecution',    icon: Shield,      action: '/terminal/settings' },
                ] as const).map(({ label, key, icon: Icon, action }) => {
                  const available = caps[key];
                  return (
                    <GlowCard key={key} className="p-4 border-white/[0.04]">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${available ? 'text-accent-lime' : 'text-text-muted'}`} />
                        <span className="font-manrope text-xs font-bold text-white">{label}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        {available ? (
                          <CheckCircle className="h-4 w-4 text-accent-lime" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className={`font-manrope text-xs ${available ? 'text-accent-lime' : 'text-red-400'}`}>
                          {available ? 'Available' : 'Unavailable'}
                        </span>
                      </div>
                      {!available && (
                        <button
                          onClick={() => router.push(action)}
                          className="mt-2 font-manrope text-[10px] text-accent-lime/70 hover:text-accent-lime underline underline-offset-2"
                        >
                          Configure →
                        </button>
                      )}
                    </GlowCard>
                  );
                })}
              </div>
            )}

            {/* Blockers */}
            {scanData.blockers && scanData.blockers.length > 0 && (
              <GlowCard className="p-5 border-amber-500/20 bg-amber-500/[0.04]">
                <h3 className="font-sora text-sm font-bold text-amber-400">Execution Blockers</h3>
                <ul className="mt-3 space-y-2">
                  {scanData.blockers.map((b, i) => (
                    <li key={i} className="flex items-center gap-2 font-manrope text-xs text-text-secondary">
                      <X className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                      {b}
                    </li>
                  ))}
                </ul>
              </GlowCard>
            )}

            {/* Errors from fetches */}
            {scanData.errors && scanData.errors.length > 0 && (
              <GlowCard className="p-5 border-danger/15">
                <h3 className="font-sora text-sm font-bold text-danger">Provider Errors</h3>
                <ul className="mt-3 space-y-1">
                  {scanData.errors.map((e, i) => (
                    <li key={i} className="font-mono text-xs text-text-muted">{e}</li>
                  ))}
                </ul>
              </GlowCard>
            )}

            {/* Agent reasoning output — only shown when market data is available */}
            {caps?.marketIntelligence && (
              <>
                <AgentReasoningPanel>
                  <h2 className="font-sora text-base font-bold text-white">Signal Input Context</h2>
                  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {[
                      ['Composite Score', `${scanData.compositeScore ?? 0}`],
                      ['Portfolio Net Delta', `${scanData.portfolioDelta?.toFixed(2) ?? '0.00'}`],
                      ['Signals Analyzed', `${scanData.signals?.length ?? 0}`],
                      ['Confidence Level', `${scanData.confidence ?? 0}%`],
                      ['Requires Confirmation', scanData.requiresConfirmation ? 'YES' : 'NO'],
                      ['Decision', (scanData.decision ?? 'watch').toUpperCase()]
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
                    {scanData.reasoningSteps?.map((step, index) => (
                      <div key={step} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-lime font-mono text-xs font-bold text-black">
                          {index + 1}
                        </div>
                        <p className="flex-1 font-manrope text-sm leading-6 text-white">
                          {step}
                        </p>
                        <Check className="h-4 w-4 shrink-0 text-accent-lime" />
                      </div>
                    ))}
                  </div>
                </AgentReasoningPanel>

                <AgentReasoningPanel>
                  <h2 className="font-sora text-base font-bold text-white">Decision Logic</h2>
                  <pre className="mt-5 overflow-x-auto rounded-xl border border-white/[0.06] bg-surface-1 p-5 font-mono text-xs leading-6 text-text-secondary">
{`RULE SET - DeltaGuard AI v1.0 (Deterministic Engine)

${scanData.decisionRule || 'No specific decision rule applied.'}`}
                  </pre>
                </AgentReasoningPanel>

                <AgentReasoningPanel>
                  <h2 className="mb-5 font-sora text-base font-bold text-white">Hedge Recommendation</h2>
                  <HedgeProposalCard output={scanData} full />
                </AgentReasoningPanel>

                {scanData.reasoningNarrative && scanData.reasoningNarrative.length > 0 && (
                  <AgentReasoningPanel>
                    <h2 className="font-sora text-base font-bold text-white">Rationale Narrative</h2>
                    <div className="mt-4 space-y-4">
                      {scanData.reasoningNarrative.map((paragraph, i) => (
                        <p key={i} className="font-manrope text-sm leading-7 text-text-secondary">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </AgentReasoningPanel>
                )}

                {scanData.warnings && scanData.warnings.length > 0 && (
                  <AgentReasoningPanel>
                    <div className="flex items-center gap-3">
                      <h2 className="font-sora text-base font-bold text-white">Risk Warnings</h2>
                      <StatusBadge variant="warning" label="Risk Disclosure" />
                    </div>
                    <div className="mt-5 space-y-3">
                      {scanData.warnings.map((warning) => (
                        <div key={warning} className="flex gap-3 rounded-xl bg-warning-dim p-3">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                          <p className="font-manrope text-sm leading-6 text-text-secondary">{warning}</p>
                        </div>
                      ))}
                    </div>
                  </AgentReasoningPanel>
                )}

                {scanData.refusals && scanData.refusals.length > 0 && (
                  <AgentReasoningPanel>
                    <h2 className="font-sora text-base font-bold text-white">Agent Constraints</h2>
                    <div className="mt-5 space-y-3">
                      {scanData.refusals.map((refusal) => (
                        <div key={refusal} className="flex gap-3 rounded-xl bg-danger-dim p-3">
                          <X className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                          <p className="font-manrope text-sm leading-6 text-text-secondary">{refusal}</p>
                        </div>
                      ))}
                    </div>
                  </AgentReasoningPanel>
                )}

                <DecisionRuleCard />
              </>
            )}

            {/* Market unavailable state */}
            {!caps?.marketIntelligence && (
              <GlowCard className="p-8 text-center border-white/[0.04]">
                <AlertTriangle className="mx-auto h-10 w-10 text-amber-400" />
                <h3 className="mt-4 font-sora text-base font-bold text-white">Market Intelligence Unavailable</h3>
                <p className="mt-2 font-manrope text-sm text-text-secondary max-w-md mx-auto">
                  SoSoValue market signals are not available. Check your API credentials in diagnostics.
                </p>
                <div className="mt-4 flex justify-center gap-3">
                  <PillButton size="sm" onClick={() => router.push('/terminal/diagnostics')}>
                    Open Diagnostics
                  </PillButton>
                  <PillButton size="sm" variant="secondary" onClick={() => runScan()}>
                    Retry Scan
                  </PillButton>
                </div>
              </GlowCard>
            )}

            {/* Portfolio unavailable state */}
            {caps?.marketIntelligence && !caps?.portfolioExposure && (
              <GlowCard className="p-6 border-white/[0.04]">
                <h3 className="font-sora text-sm font-bold text-white">Portfolio Exposure Not Connected</h3>
                <p className="mt-2 font-manrope text-xs text-text-secondary">
                  {scanData.portfolioExposure
                    ? scanData.portfolioExposure.message
                    : 'Connect a wallet or paste a watch address on the Portfolio page to enable hedge sizing.'}
                </p>
                <PillButton size="sm" className="mt-4" onClick={() => router.push('/terminal/portfolio')}>
                  Connect Portfolio →
                </PillButton>
              </GlowCard>
            )}
          </>
        ) : null}
      </div>
    </>
  );
}
