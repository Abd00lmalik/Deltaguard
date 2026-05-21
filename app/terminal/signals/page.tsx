'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, Activity } from 'lucide-react';
import { Topbar } from '@/components/layout/Topbar';
import { CompositeSignalScore } from '@/components/signals/CompositeSignalScore';
import { SignalFeed } from '@/components/signals/SignalFeed';
import { SignalSourceBadge } from '@/components/signals/SignalSourceBadge';
import { GlowCard } from '@/components/ui/GlowCard';
import { LoadingState } from '@/components/ui/LoadingState';
import { PillButton } from '@/components/ui/PillButton';
import { SectionLabel } from '@/components/ui/SectionLabel';
import type { CompositeScore, MarketSignal } from '@/types/signals';
import type { SignalSource } from '@/lib/types/signal-source';

interface SignalMetadata {
  source: SignalSource;
  providerHealth: string;
  dataSourcesUsed: string[];
  lastUpdated: string;
  errors: { provider: string; endpoint: string; httpStatus: number | null; message: string }[];
  cacheAgeSeconds?: number;
}

interface SignalSummary {
  total: number;
  available: number;
  unavailable: number;
}

export default function TerminalSignalsPage() {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [setup, setSetup] = useState<string | null>(null);
  const [signals, setSignals] = useState<MarketSignal[] | undefined>(undefined);
  const [composite, setComposite] = useState<CompositeScore | undefined>(undefined);
  const [metadata, setMetadata] = useState<SignalMetadata | null>(null);
  const [summary, setSummary] = useState<SignalSummary | null>(null);

  async function checkSignals() {
    setStatus('loading');
    setErrorMsg(null);
    try {
      const res = await fetch('/api/terminal/signals');
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Unknown error');
        setSetup(data.setup ?? null);
        setMetadata(data.metadata ?? null);
        setStatus('error');
      } else {
        setSignals(data.signals);
        setComposite(data.composite);
        setMetadata(data.metadata ?? null);
        setSummary(data.summary ?? null);
        setStatus('ok');
      }
    } catch {
      setErrorMsg('Network error — could not reach signals endpoint.');
      setStatus('error');
    }
  }

  useEffect(() => { void checkSignals(); }, []);

  const signalSource = metadata?.source ?? 'unavailable';

  return (
    <>
      <Topbar title="Signal Monitor" action={
        <PillButton size="sm" variant="secondary" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={checkSignals}>
          Refresh
        </PillButton>
      } />
      <div className="space-y-6 p-4 pb-24 sm:p-6 lg:p-8">
        <header>
          <SectionLabel>Market Intelligence</SectionLabel>
          <h1 className="mt-3 font-sora text-2xl font-bold text-white">Market Signals</h1>
          <p className="mt-2 max-w-2xl font-manrope text-sm leading-6 text-text-secondary">
            Nine market intelligence signals normalized into a single defensive regime score via live SoSoValue OpenAPI data.
          </p>
          {/* Dynamic source badge — never hardcoded */}
          {status !== 'loading' && (
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <SignalSourceBadge
                source={signalSource}
                cacheAgeSeconds={metadata?.cacheAgeSeconds}
              />
              {summary && (
                <span className="font-manrope text-xs text-text-muted">
                  {summary.available}/{summary.total} signals active
                  {summary.unavailable > 0 && ` · ${summary.unavailable} unavailable`}
                </span>
              )}
              {/* Explain derived signals inline */}
              {summary && summary.available > 0 && (
                <span className="rounded-lg bg-amber-500/10 px-2 py-0.5 font-manrope text-[10px] font-semibold text-amber-400">
                  DERIVED — signals computed from BTC & SSI index data proxies
                </span>
              )}
            </div>
          )}
          {/* Provenance note shown once signals load */}
          {status === 'ok' && signals && signals.length > 0 && (
            <p className="mt-3 font-manrope text-[11px] text-text-muted max-w-2xl">
              <span className="text-accent-lime font-semibold">Data provenance:</span> ETF Flow Pressure, BTC Volatility, Funding Rate Pressure, and On-Chain Risk are derived from BTC 24h price momentum via SoSoValue market-snapshot. Macro Treasury Pressure and Stablecoin Liquidity are derived from the SSI Mega-7 index. Market Sentiment and News/Regime Alert are computed directly from SoSoValue news feed. SSI Index Momentum is unavailable (SSI Protocol offline).
            </p>
          )}
        </header>

        {/* Explain how Signals are used */}
        {status === 'ok' && signals && signals.length > 0 && (
          <GlowCard className="p-5 border-accent-lime/10 bg-accent-lime/[0.02]">
            <h3 className="font-sora text-sm font-bold text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-accent-lime animate-pulse" /> How Market Signals Work
            </h3>
            <p className="mt-2 font-manrope text-xs text-text-secondary leading-5">
              This panel tracks live market feeds across 9 core quantitative metrics from the SoSoValue OpenAPI. 
              When market feeds fail or are unavailable (such as the offline SSI Protocol), DeltaGuard calculates <strong>derived proxy metrics</strong> using BTC's live price momentum to maintain risk coverage.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-surface-2 p-3 border border-white/[0.04]">
                <span className="text-[10px] font-bold text-accent-lime uppercase tracking-wider block">1. The Score Gauge</span>
                <p className="mt-1 font-manrope text-[11px] text-text-secondary">
                  Normalizes all active signals into a composite score between <strong>-100 (high risk)</strong> and <strong>+100 (low risk)</strong>.
                </p>
              </div>
              <div className="rounded-lg bg-surface-2 p-3 border border-white/[0.04]">
                <span className="text-[10px] font-bold text-accent-lime uppercase tracking-wider block">2. Regime Scans</span>
                <p className="mt-1 font-manrope text-[11px] text-text-secondary">
                  A composite score below <strong>-50</strong> triggers a Caution/Panic regime. If your portfolio delta is long, a hedge is advised.
                </p>
              </div>
              <div className="rounded-lg bg-surface-2 p-3 border border-white/[0.04]">
                <span className="text-[10px] font-bold text-accent-lime uppercase tracking-wider block">3. Live Execution</span>
                <p className="mt-1 font-manrope text-[11px] text-text-secondary">
                  Once a hedge is proposed, you can review it on the <strong>Execution Console</strong> and submit a signed order to the SoDEX testnet.
                </p>
              </div>
            </div>
          </GlowCard>
        )}

        {status === 'loading' ? (
          <LoadingState messages={['Connecting to SoSoValue API...', 'Fetching live signals...']} activeIndex={0} />
        ) : status === 'error' ? (
          <GlowCard className="border-danger/25 p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
              <div className="flex-1">
                <p className="font-sora text-base font-bold text-white">SoSoValue Signals Unavailable</p>
                <p className="mt-2 font-manrope text-sm text-text-secondary">{errorMsg}</p>
                {setup && (
                  <p className="mt-3 rounded-xl bg-danger-dim p-3 font-mono text-xs text-danger">
                    Setup required: {setup}
                  </p>
                )}
                {metadata?.errors && metadata.errors.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {metadata.errors.map((e, i) => (
                      <p key={i} className="font-mono text-xs text-text-muted">
                        {e.provider} {e.endpoint}: {e.message}
                        {e.httpStatus ? ` (HTTP ${e.httpStatus})` : ''}
                      </p>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex items-center gap-4">
                  <PillButton size="sm" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={checkSignals}>
                    Retry
                  </PillButton>
                  {metadata && <SignalSourceBadge source={metadata.source} />}
                </div>
              </div>
            </div>
          </GlowCard>
        ) : (
          <>
            <CompositeSignalScore score={composite} />
            <SignalFeed signals={signals} />
          </>
        )}
      </div>
    </>
  );
}
