'use client';

import { Topbar } from '@/components/layout/Topbar';
import { CompositeSignalScore } from '@/components/signals/CompositeSignalScore';
import { SignalFeed } from '@/components/signals/SignalFeed';
import { SectionLabel } from '@/components/ui/SectionLabel';

export default function DemoSignalsPage() {
  return (
    <>
      <Topbar title="Signal Monitor" />
      <div className="space-y-6 p-4 pb-24 sm:p-6 lg:p-8">
        <header>
          <SectionLabel>SoSoValue Signal Feed</SectionLabel>
          <h1 className="mt-3 font-sora text-2xl font-bold text-white">Market Signals</h1>
          <p className="mt-2 max-w-2xl font-manrope text-sm leading-6 text-text-secondary">
            Nine market intelligence signals are normalized into a single defensive regime score.
          </p>
        </header>

        <CompositeSignalScore />
        <SignalFeed />
      </div>
    </>
  );
}
