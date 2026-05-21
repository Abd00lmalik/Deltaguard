'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
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
            Nine live market intelligence signals normalized into a single defensive regime score via SoSoValue OpenAPI.
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
            </div>
          )}
        </header>

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
