'use client';

import { GitBranch } from 'lucide-react';
import { Topbar } from '@/components/layout/Topbar';
import { AllocationChart } from '@/components/portfolio/AllocationChart';
import { ExposureChart } from '@/components/portfolio/ExposureChart';
import { PortfolioTable } from '@/components/portfolio/PortfolioTable';
import { IntegrationStatusCard } from '@/components/integrations/IntegrationStatusCard';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { StatusBadge } from '@/components/ui/StatusBadge';

export default function PortfolioPage() {
  return (
    <>
      <Topbar title="Portfolio" />
      <div className="space-y-6 p-4 pb-24 sm:p-6 lg:p-8">
        <header>
          <div className="flex flex-wrap items-center gap-3">
            <SectionLabel>SSI Portfolio</SectionLabel>
            <StatusBadge variant="muted" label="SSI Protocol" />
          </div>
          <h1 className="mt-3 font-sora text-2xl font-bold text-white">Holdings &amp; Exposure</h1>
          <p className="mt-2 max-w-2xl font-manrope text-sm leading-6 text-text-secondary">
            Holdings model SSI index exposure, portfolio delta, volatility, allocation, and risk contribution.
          </p>
        </header>

        <PortfolioTable />

        <div className="grid gap-6 xl:grid-cols-2">
          <AllocationChart />
          <ExposureChart />
        </div>

        <IntegrationStatusCard
          name="SSI Protocol"
          icon={GitBranch}
          statusBadge="ACTIVE"
          description="Tracks index-style portfolio holdings, exposure, allocation, and risk contribution data used by the risk engine."
        />
      </div>
    </>
  );
}
