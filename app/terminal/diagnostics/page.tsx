'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Activity, Server, Database, Globe, ArrowDownToLine, Zap } from 'lucide-react';
import { Topbar } from '@/components/layout/Topbar';
import { PillButton } from '@/components/ui/PillButton';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { cn } from '@/lib/utils/cn';

interface DiagnosticsData {
  sosovalue: {
    baseUrlHost: string;
    endpointsCalled: string[];
    httpErrors: string[];
    signalSource: string;
    providerHealth: string;
    cacheAgeSeconds: number | null;
    fetchLatencyMs: number | null;
    responseSizeBytes: number | null;
    signalCount: number;
    lastUpdated: string | null;
    available: boolean;
  };
  ssi: {
    sourceType: string;
    endpoint: string;
    available: boolean;
    setupRequired: boolean;
    message: string;
  };
  sodexPublic: {
    baseUrlHost: string;
    httpStatus: number | null;
    latencyMs: number | null;
    available: boolean;
    error: string | null;
  };
  sodexSigned: {
    accountId: string | null;
    accountAddress: string | null;
    credentialsPresent: boolean;
    accountInitialized: boolean;
  };
  database: {
    status: string;
    connected: boolean;
  };
  checkedAt: string;
}

function StatusPulse({ active, warning, error }: { active: boolean; warning?: boolean; error?: boolean }) {
  return (
    <span className="relative flex h-3 w-3 shrink-0">
      <span className={cn(
        "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
        error ? "bg-red-500" : warning ? "bg-amber-400" : active ? "bg-accent-lime" : "bg-neutral-600"
      )}></span>
      <span className={cn(
        "relative inline-flex h-3 w-3 rounded-full",
        error ? "bg-red-500" : warning ? "bg-amber-500" : active ? "bg-accent-lime" : "bg-neutral-500"
      )}></span>
    </span>
  );
}

function MetricBox({ label, value, subtext, highlight }: { label: string; value: React.ReactNode; subtext?: string; highlight?: 'good' | 'warn' | 'bad' | 'neutral' }) {
  return (
    <div className="flex flex-col justify-between rounded-md border border-white/[0.05] bg-neutral-900/50 p-3">
      <span className="font-manrope text-[10px] font-bold uppercase tracking-wider text-text-muted">{label}</span>
      <div className="mt-2 flex items-baseline gap-2">
        <span className={cn(
          "font-mono text-lg font-bold",
          highlight === 'good' ? 'text-accent-lime' : highlight === 'warn' ? 'text-amber-400' : highlight === 'bad' ? 'text-red-400' : 'text-white'
        )}>
          {value}
        </span>
        {subtext && <span className="font-mono text-[10px] text-text-secondary">{subtext}</span>}
      </div>
    </div>
  );
}

function getLatencyHighlight(ms: number | null) {
  if (ms === null) return 'neutral';
  if (ms < 300) return 'good';
  if (ms < 1000) return 'warn';
  return 'bad';
}

function formatBytes(bytes: number | null) {
  if (bytes === null) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export default function TerminalDiagnosticsPage() {
  const [data, setData] = useState<DiagnosticsData | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchDiagnostics() {
    setLoading(true);
    try {
      const res = await fetch('/api/terminal/diagnostics');
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void fetchDiagnostics(); }, []);

  // Poll every 5 seconds for live Bloomberg feel
  useEffect(() => {
    const interval = setInterval(fetchDiagnostics, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Topbar
        title="Terminal Diagnostics"
        action={
          <PillButton size="sm" variant="secondary" icon={<RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />} onClick={fetchDiagnostics}>
            Force Refresh
          </PillButton>
        }
      />

      <div className="space-y-6 p-4 pb-24 sm:p-6 lg:p-8">
        <header className="flex items-start justify-between">
          <div>
            <SectionLabel>Live Telemetry Monitor</SectionLabel>
            <h1 className="mt-3 font-sora text-2xl font-bold text-white flex items-center gap-3">
              <Activity className="h-6 w-6 text-accent-lime" />
              System Diagnostics
            </h1>
            <p className="mt-2 max-w-xl font-manrope text-sm leading-6 text-text-secondary">
              Real-time latency, provider health, and gateway metrics. Auto-refreshing 5s cycle. No secrets exposed.
            </p>
          </div>
          {data && (
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-surface-2 px-4 py-2">
              <StatusPulse active={true} />
              <span className="font-mono text-xs text-text-secondary">Pulse Active</span>
            </div>
          )}
        </header>

        {!data ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-white/5 bg-surface-1">
            <p className="font-mono text-sm text-text-muted animate-pulse">Establishing telemetry link...</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* SoSoValue Live Feed */}
            <div className="flex flex-col rounded-2xl border border-white/10 bg-surface-1 overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-5 py-4">
                <h2 className="flex items-center gap-2 font-sora text-sm font-bold text-white">
                  <Globe className="h-4 w-4 text-accent-lime" /> SoSoValue Gateway
                </h2>
                <StatusPulse active={data.sosovalue.available} warning={data.sosovalue.providerHealth === 'degraded'} error={!data.sosovalue.available} />
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <MetricBox 
                    label="Latency" 
                    value={data.sosovalue.fetchLatencyMs ? `${data.sosovalue.fetchLatencyMs}` : '—'} 
                    subtext="ms"
                    highlight={getLatencyHighlight(data.sosovalue.fetchLatencyMs)}
                  />
                  <MetricBox 
                    label="Payload" 
                    value={formatBytes(data.sosovalue.responseSizeBytes).split(' ')[0]} 
                    subtext={formatBytes(data.sosovalue.responseSizeBytes).split(' ')[1]}
                    highlight="neutral"
                  />
                  <MetricBox 
                    label="Signals Parsed" 
                    value={data.sosovalue.signalCount} 
                    highlight={data.sosovalue.signalCount > 0 ? 'good' : 'bad'}
                  />
                </div>
                
                <div className="mt-5 space-y-3 font-mono text-xs text-text-secondary">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span>Host</span>
                    <span className="text-white">{data.sosovalue.baseUrlHost}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span>Cache TTL</span>
                    <span className="text-white">{data.sosovalue.cacheAgeSeconds !== null ? `${Math.round(data.sosovalue.cacheAgeSeconds)}s` : 'Fresh'}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span>Health</span>
                    <span className={data.sosovalue.providerHealth === 'connected' ? 'text-accent-lime' : 'text-amber-400'}>{data.sosovalue.providerHealth.toUpperCase()}</span>
                  </div>
                </div>

                {data.sosovalue.httpErrors.length > 0 && (
                  <div className="mt-4 rounded-md bg-red-500/10 p-3 border border-red-500/20">
                    <p className="font-manrope text-[10px] font-bold uppercase tracking-wider text-red-400 mb-2">Endpoint Failures</p>
                    {data.sosovalue.httpErrors.map((err, i) => (
                      <p key={i} className="font-mono text-[10px] text-red-300 mb-1 last:mb-0 break-all">{err}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* SoDEX Public Health */}
            <div className="flex flex-col rounded-2xl border border-white/10 bg-surface-1 overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-5 py-4">
                <h2 className="flex items-center gap-2 font-sora text-sm font-bold text-white">
                  <Server className="h-4 w-4 text-accent-lime" /> SoDEX Trade Gateway
                </h2>
                <StatusPulse active={data.sodexPublic.available} error={!data.sodexPublic.available} />
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 gap-3">
                  <MetricBox 
                    label="API Latency" 
                    value={data.sodexPublic.latencyMs ? `${data.sodexPublic.latencyMs}` : '—'} 
                    subtext="ms"
                    highlight={getLatencyHighlight(data.sodexPublic.latencyMs)}
                  />
                  <MetricBox 
                    label="HTTP Status" 
                    value={data.sodexPublic.httpStatus || 'ERR'} 
                    highlight={data.sodexPublic.httpStatus === 200 ? 'good' : 'bad'}
                  />
                </div>

                <div className="mt-5 space-y-3 font-mono text-xs text-text-secondary">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span>Host</span>
                    <span className="text-white">{data.sodexPublic.baseUrlHost}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span>Account ID</span>
                    <span className="text-white">{data.sodexSigned.accountId || 'MISSING'}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span>Signer Key</span>
                    <span className={data.sodexSigned.credentialsPresent ? 'text-accent-lime' : 'text-red-400'}>
                      {data.sodexSigned.credentialsPresent ? 'PRESENT' : 'MISSING'}
                    </span>
                  </div>
                </div>

                {data.sodexPublic.error && (
                  <div className="mt-4 rounded-md bg-red-500/10 p-3 border border-red-500/20">
                    <p className="font-manrope text-[10px] font-bold uppercase tracking-wider text-red-400 mb-1">Connection Error</p>
                    <p className="font-mono text-[10px] text-red-300 break-all">{data.sodexPublic.error}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Legacy SSI / Discontinued */}
            <div className="flex flex-col rounded-2xl border border-white/10 bg-surface-1 overflow-hidden opacity-60">
              <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-5 py-4">
                <h2 className="flex items-center gap-2 font-sora text-sm font-bold text-white">
                  <ArrowDownToLine className="h-4 w-4 text-neutral-400" /> SSI Protocol (Sunset)
                </h2>
                <StatusPulse active={false} error={true} />
              </div>
              <div className="p-5">
                <MetricBox 
                  label="Network State" 
                  value="OFFLINE" 
                  highlight="bad"
                />
                <div className="mt-5 space-y-3 font-mono text-xs text-text-secondary">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span>Status</span>
                    <span className="text-red-400">Connection Refused (Option C)</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2 text-wrap break-all">
                    <span>Details</span>
                    <span className="text-white text-right max-w-[200px]">{data.ssi.message}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Local DB */}
            <div className="flex flex-col rounded-2xl border border-white/10 bg-surface-1 overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-5 py-4">
                <h2 className="flex items-center gap-2 font-sora text-sm font-bold text-white">
                  <Database className="h-4 w-4 text-accent-lime" /> State Database
                </h2>
                <StatusPulse active={data.database.connected} error={!data.database.connected} />
              </div>
              <div className="p-5">
                <MetricBox 
                  label="Connection Link" 
                  value={data.database.status.toUpperCase()} 
                  highlight={data.database.connected ? 'good' : 'bad'}
                />
              </div>
            </div>
            
          </div>
        )}
        
        {data && (
          <div className="mt-6 flex items-center gap-2 justify-end">
            <Zap className="h-3 w-3 text-accent-lime" />
            <p className="font-mono text-[10px] text-text-muted">
              Live telemetry snapshot: {new Date(data.checkedAt).toLocaleTimeString()}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
