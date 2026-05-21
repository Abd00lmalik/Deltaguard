'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Topbar } from '@/components/layout/Topbar';
import { GlowCard } from '@/components/ui/GlowCard';
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

function StatusDot({ ok, warn }: { ok: boolean; warn?: boolean }) {
  if (ok) return <CheckCircle className="h-4 w-4 shrink-0 text-accent-lime" />;
  if (warn) return <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />;
  return <XCircle className="h-4 w-4 shrink-0 text-red-500" />;
}

function DiagRow({ label, value, ok, warn }: { label: string; value: string; ok?: boolean; warn?: boolean }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
      <div className="mt-0.5">
        {ok !== undefined && <StatusDot ok={ok} warn={warn} />}
      </div>
      <div className="min-w-0 flex-1">
        <span className="font-manrope text-xs text-text-muted">{label}</span>
        <p className={cn('font-mono text-xs mt-0.5 break-all', ok === false ? 'text-red-400' : ok === true ? 'text-accent-lime' : 'text-text-secondary')}>
          {value}
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <GlowCard className="p-5 border-white/[0.04]">
      <h2 className="font-sora text-sm font-bold text-white mb-4">{title}</h2>
      <div className="space-y-0">{children}</div>
    </GlowCard>
  );
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

  return (
    <>
      <Topbar
        title="Diagnostics"
        action={
          <PillButton size="sm" variant="secondary" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={fetchDiagnostics} loading={loading}>
            Refresh
          </PillButton>
        }
      />

      <div className="space-y-6 p-4 pb-24 sm:p-6 lg:p-8">
        <header>
          <SectionLabel>Developer Tools</SectionLabel>
          <h1 className="mt-3 font-sora text-2xl font-bold text-white">Integration Diagnostics</h1>
          <p className="mt-2 font-manrope text-sm text-text-secondary">
            Live integration status across all providers. No secrets are exposed here.
          </p>
        </header>

        {loading && !data ? (
          <p className="font-manrope text-sm text-text-muted animate-pulse">Running diagnostics...</p>
        ) : data ? (
          <>
            <Section title="SoSoValue">
              <DiagRow label="Base URL Host"    value={data.sosovalue.baseUrlHost} ok={data.sosovalue.available} />
              <DiagRow label="Endpoints Called" value={data.sosovalue.endpointsCalled.join(', ')} />
              <DiagRow label="Signal Source"    value={data.sosovalue.signalSource} ok={data.sosovalue.signalSource === 'live' || data.sosovalue.signalSource === 'derived'} warn={data.sosovalue.signalSource === 'partial' || data.sosovalue.signalSource === 'cached'} />
              <DiagRow label="Provider Health"  value={data.sosovalue.providerHealth} ok={data.sosovalue.providerHealth === 'connected'} warn={data.sosovalue.providerHealth === 'degraded'} />
              <DiagRow label="Cache Age"        value={data.sosovalue.cacheAgeSeconds !== null ? `${Math.round(data.sosovalue.cacheAgeSeconds)}s` : 'not cached'} />
              <DiagRow label="Last Updated"     value={data.sosovalue.lastUpdated ?? 'never'} />
              <DiagRow label="Available"        value={data.sosovalue.available ? 'yes' : 'no'} ok={data.sosovalue.available} />
              {data.sosovalue.httpErrors.length > 0 && (
                <div className="mt-2 rounded-xl bg-danger/5 p-3">
                  <p className="font-manrope text-xs text-danger font-bold">Errors</p>
                  {data.sosovalue.httpErrors.map((e, i) => (
                    <p key={i} className="font-mono text-xs text-red-400 mt-1">{e}</p>
                  ))}
                </div>
              )}
            </Section>

            <Section title="SSI Protocol">
              <DiagRow label="Source Type"    value={data.ssi.sourceType} ok={data.ssi.available} warn={data.ssi.setupRequired} />
              <DiagRow label="Endpoint"       value={data.ssi.endpoint} />
              <DiagRow label="Available"      value={data.ssi.available ? 'yes' : 'no'} ok={data.ssi.available} />
              <DiagRow label="Setup Required" value={data.ssi.setupRequired ? 'yes' : 'no'} ok={!data.ssi.setupRequired} />
              <DiagRow label="Status Message" value={data.ssi.message} />
            </Section>

            <Section title="SoDEX Public">
              <DiagRow label="Base URL Host" value={data.sodexPublic.baseUrlHost || 'not configured'} ok={data.sodexPublic.available} />
              <DiagRow label="HTTP Status"   value={data.sodexPublic.httpStatus !== null ? String(data.sodexPublic.httpStatus) : 'no response'} ok={data.sodexPublic.available} />
              <DiagRow label="Available"     value={data.sodexPublic.available ? 'yes' : 'no'} ok={data.sodexPublic.available} />
              {data.sodexPublic.error && (
                <DiagRow label="Error" value={data.sodexPublic.error} ok={false} />
              )}
            </Section>

            <Section title="SoDEX Signed Execution">
              <DiagRow label="Account ID"           value={data.sodexSigned.accountId ?? 'not configured'} ok={Boolean(data.sodexSigned.accountId)} />
              <DiagRow label="Account Address"      value={data.sodexSigned.accountAddress ?? 'not configured'} ok={Boolean(data.sodexSigned.accountAddress)} />
              <DiagRow label="Credentials Present"  value={data.sodexSigned.credentialsPresent ? 'yes' : 'no'} ok={data.sodexSigned.credentialsPresent} />
              <DiagRow label="Account Initialized"  value={data.sodexSigned.accountInitialized ? 'yes' : 'no'} ok={data.sodexSigned.accountInitialized} />
            </Section>

            <Section title="Database">
              <DiagRow label="Status"    value={data.database.status} ok={data.database.connected} />
              <DiagRow label="Connected" value={data.database.connected ? 'yes' : 'no'} ok={data.database.connected} />
            </Section>

            <p className="font-manrope text-xs text-text-muted">
              Diagnostics checked at: {data.checkedAt}
            </p>
          </>
        ) : null}
      </div>
    </>
  );
}
