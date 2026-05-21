'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, GitBranch, RefreshCw } from 'lucide-react';
import { Topbar } from '@/components/layout/Topbar';
import { AllocationChart } from '@/components/portfolio/AllocationChart';
import { ExposureChart } from '@/components/portfolio/ExposureChart';
import { GlowCard } from '@/components/ui/GlowCard';
import { LoadingState } from '@/components/ui/LoadingState';
import { PillButton } from '@/components/ui/PillButton';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { IntegrationStatusCard } from '@/components/integrations/IntegrationStatusCard';
import type { PortfolioAsset } from '@/types/portfolio';

export default function TerminalPortfolioPage() {
  const [assets, setAssets] = useState<PortfolioAsset[] | null>(null);
  const [error, setError] = useState<{ error: string; code?: string; setup?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadPortfolio() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/terminal/portfolio');
      const data = await res.json();
      if (!res.ok) {
        setError(data);
      } else {
        setAssets(data.assets ?? []);
      }
    } catch {
      setError({ error: 'Network error — could not reach portfolio endpoint.' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadPortfolio(); }, []);

  const totalValue = assets?.reduce((s, a) => s + a.valueUsd, 0) ?? 0;

  return (
    <>
      <Topbar title="Portfolio" action={
        <PillButton size="sm" variant="secondary" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={loadPortfolio}>
          Refresh
        </PillButton>
      } />
      <div className="space-y-6 p-4 pb-24 sm:p-6 lg:p-8">
        <header>
          <div className="flex flex-wrap items-center gap-3">
            <SectionLabel>SSI Portfolio</SectionLabel>
            <StatusBadge variant={assets ? 'safe' : 'danger'} label={assets ? 'Live Data' : 'Offline'} />
          </div>
          <h1 className="mt-3 font-sora text-2xl font-bold text-white">Holdings &amp; Exposure</h1>
          <p className="mt-2 max-w-2xl font-manrope text-sm leading-6 text-text-secondary">
            Live index exposure, portfolio delta, volatility, allocation, and risk contribution from SSI Protocol.
          </p>
        </header>

        {loading ? (
          <LoadingState messages={['Connecting to SSI Protocol...', 'Fetching live holdings...']} activeIndex={0} />
        ) : error ? (
          <GlowCard className="border-danger/25 p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
              <div className="flex-1">
                <p className="font-sora text-base font-bold text-white">SSI Portfolio Unavailable</p>
                <p className="mt-2 font-manrope text-sm text-text-secondary">{error.error}</p>
                {error.setup && (
                  <p className="mt-3 rounded-xl bg-danger-dim p-3 font-mono text-xs text-danger">
                    Setup required: {error.setup}
                  </p>
                )}
                <PillButton size="sm" className="mt-4" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={loadPortfolio}>
                  Retry
                </PillButton>
              </div>
            </div>
          </GlowCard>
        ) : (
          <>
            {/* Live holdings table */}
            <GlowCard className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full font-manrope text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {['Asset', 'Class', 'Amount', 'Price', 'Value (USD)', 'Delta', 'Allocation'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left font-manrope text-[10px] font-bold uppercase tracking-[0.12em] text-text-muted">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(assets ?? []).map((asset) => (
                      <tr key={asset.id} className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.02]">
                        <td className="px-4 py-3">
                          <p className="font-sora text-sm font-bold text-white">{asset.symbol}</p>
                          <p className="text-xs text-text-muted">{asset.name}</p>
                        </td>
                        <td className="px-4 py-3 text-text-secondary capitalize">{asset.class}</td>
                        <td className="px-4 py-3 font-mono text-white">{asset.amount.toLocaleString()}</td>
                        <td className="px-4 py-3 font-mono text-white">${asset.priceUsd.toLocaleString()}</td>
                        <td className="px-4 py-3 font-mono font-bold text-white">${asset.valueUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3 font-mono text-accent-lime">{asset.delta.toFixed(2)}</td>
                        <td className="px-4 py-3 font-mono text-text-secondary">{asset.allocation.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-white/[0.08]">
                      <td colSpan={4} className="px-4 py-3 font-manrope text-xs font-bold uppercase tracking-wider text-text-muted">Total</td>
                      <td className="px-4 py-3 font-mono font-bold text-accent-lime">${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </GlowCard>

            <div className="grid gap-6 xl:grid-cols-2">
              <AllocationChart />
              <ExposureChart />
            </div>
          </>
        )}

        <IntegrationStatusCard
          name="SSI Protocol"
          icon={GitBranch}
          statusBadge={assets ? 'ACTIVE' : 'OFFLINE'}
          description="Provides live index-style portfolio holdings, exposure, delta, and allocation data from SSI Protocol API."
        />
      </div>
    </>
  );
}
