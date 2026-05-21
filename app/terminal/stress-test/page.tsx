'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Topbar } from '@/components/layout/Topbar';
import { DGMetricCard } from '@/components/ui/MetricCard';
import { GlowCard } from '@/components/ui/GlowCard';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { ScenarioSelector } from '@/components/stress-test/ScenarioSelector';
import { BeforeAfterChart } from '@/components/stress-test/BeforeAfterChart';
import { StressTestSimulator } from '@/components/stress-test/StressTestSimulator';
import { MOCK_PORTFOLIO_SUMMARY } from '@/lib/mock/portfolio';
import { STRESS_SCENARIOS, type StressScenario } from '@/lib/mock/scenarios';
import { generateStressChartData } from '@/lib/risk/stress-test-engine';
import { clamp, formatCurrency, formatPercent } from '@/lib/utils/format';

function deriveScenario(
  base: StressScenario,
  values: Pick<StressScenario, 'btcMove' | 'ethMove' | 'ssiMemeMove' | 'volatilitySpike' | 'etfFlowPressure'>
): StressScenario {
  const severity =
    Math.abs(values.btcMove) * 0.43 +
    Math.abs(values.ethMove) * 0.2 +
    Math.abs(values.ssiMemeMove) * 0.14 +
    values.volatilitySpike * 0.045 +
    Math.abs(values.etfFlowPressure) * 0.06;
  const withoutHedge = -Number(clamp(severity, 4, 62).toFixed(1));
  const effectiveness = Math.round(
    clamp(
      45 + values.volatilitySpike * 0.045 + Math.abs(values.etfFlowPressure) * 0.08 - Math.max(0, Math.abs(values.ssiMemeMove) - 60) * 0.2,
      38,
      72
    )
  );
  const withHedge = Number((withoutHedge * (1 - effectiveness / 100)).toFixed(1));
  return {
    ...base,
    ...values,
    estimatedDrawdownWithoutHedge: withoutHedge,
    estimatedDrawdownWithHedge: withHedge,
    hedgeEffectiveness: effectiveness
  };
}

export default function TerminalStressTestPage() {
  const [selectedScenario, setSelectedScenario] = useState<StressScenario>(STRESS_SCENARIOS[0]);
  const [customValues, setCustomValues] = useState({
    btcMove: STRESS_SCENARIOS[0].btcMove,
    ethMove: STRESS_SCENARIOS[0].ethMove,
    ssiMemeMove: STRESS_SCENARIOS[0].ssiMemeMove,
    volatilitySpike: STRESS_SCENARIOS[0].volatilitySpike,
    etfFlowPressure: STRESS_SCENARIOS[0].etfFlowPressure
  });

  const scenario = useMemo(() => deriveScenario(selectedScenario, customValues), [customValues, selectedScenario]);
  const chartData = useMemo(() => generateStressChartData(scenario, MOCK_PORTFOLIO_SUMMARY), [scenario]);

  function selectScenario(next: StressScenario) {
    setSelectedScenario(next);
    setCustomValues({
      btcMove: next.btcMove,
      ethMove: next.ethMove,
      ssiMemeMove: next.ssiMemeMove,
      volatilitySpike: next.volatilitySpike,
      etfFlowPressure: next.etfFlowPressure
    });
  }

  function updateValue(key: keyof typeof customValues, value: number) {
    setCustomValues((current) => ({ ...current, [key]: value }));
  }

  const commentary =
    customValues.btcMove < -30
      ? 'Severe BTC correction scenario. Agent confidence in hedge: HIGH.'
      : customValues.btcMove < -15
        ? 'Moderate correction. Hedge provides meaningful partial protection.'
        : 'Mild scenario. Hedge may not be triggered at current signal levels.';

  return (
    <>
      <Topbar title="Stress Test" />
      <StressTestSimulator>
        <div className="space-y-6 p-4 pb-24 sm:p-6 lg:p-8">
          <header>
            <SectionLabel>Portfolio Scenario Analysis</SectionLabel>
            <h1 className="mt-3 font-sora text-2xl font-bold text-white">Stress Test Simulator</h1>
            <p className="mt-2 max-w-2xl font-manrope text-sm leading-6 text-text-secondary">
              Model market scenarios against live portfolio deltas and see how a hedge would reduce drawdown.
            </p>
          </header>

          <ScenarioSelector scenarios={STRESS_SCENARIOS} selectedId={selectedScenario.id} onSelect={selectScenario} />

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <GlowCard className="p-5">
              <h2 className="font-sora text-base font-bold text-white">Scenario Parameters</h2>
              <div className="mt-5 space-y-5">
                {[
                  ['BTC Price Move', 'btcMove', -80, 80, 1, '%'],
                  ['ETH Price Move', 'ethMove', -80, 80, 1, '%'],
                  ['ssiMEME Drawdown', 'ssiMemeMove', -100, 80, 1, '%'],
                  ['Volatility Spike', 'volatilitySpike', 0, 300, 5, '%'],
                  ['ETF Flow Pressure', 'etfFlowPressure', -100, 0, 1, 'pts']
                ].map(([label, key, min, max, step, unit]) => (
                  <label key={String(key)} className="block">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="font-manrope text-sm font-bold text-white">{label}</span>
                      <span className="rounded-full bg-accent-lime-dim px-2.5 py-1 font-mono text-xs text-accent-lime">
                        {customValues[key as keyof typeof customValues]}{unit}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={Number(min)}
                      max={Number(max)}
                      step={Number(step)}
                      value={customValues[key as keyof typeof customValues]}
                      onChange={(e) => updateValue(key as keyof typeof customValues, Number(e.target.value))}
                      className="h-2 w-full cursor-pointer rounded-full bg-white/10"
                    />
                  </label>
                ))}
              </div>
              <p className="mt-6 rounded-xl border border-accent-lime/15 bg-accent-lime-dim p-4 font-manrope text-sm leading-6 text-text-secondary">
                {commentary}
              </p>
            </GlowCard>

            <motion.div
              key={`${selectedScenario.id}-${Object.values(customValues).join('-')}`}
              className="space-y-4"
              initial={{ opacity: 0.5, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <DGMetricCard label="Exposure Without Hedge" value={formatPercent(scenario.estimatedDrawdownWithoutHedge)} subtext="Estimated portfolio drawdown" highlight="danger" trend="down" />
              <DGMetricCard label="Protection With Hedge" value={formatPercent(scenario.estimatedDrawdownWithHedge)} subtext="Estimated portfolio drawdown" highlight="positive" />
              <DGMetricCard label="Hedge Effectiveness" value={`${scenario.hedgeEffectiveness}%`} subtext="Drawdown reduction" highlight="positive" />
              <GlowCard className="p-5">
                <p className="font-sora text-lg font-bold text-white">Agent Recommendation</p>
                <p className="mt-3 font-manrope text-sm leading-6 text-text-secondary">
                  Maintain 35% BTC/USDT short coverage. Increase review frequency if ETF flow pressure remains below -70.
                </p>
              </GlowCard>
            </motion.div>
          </div>

          <BeforeAfterChart data={chartData} />

          <GlowCard className="p-5">
            <h2 className="font-sora text-base font-bold text-white">Scenario Analysis</h2>
            <p className="mt-4 font-manrope text-sm leading-7 text-text-secondary">
              In a {scenario.label} scenario with BTC moving {scenario.btcMove}%, the unhedged portfolio is expected to experience a{' '}
              {formatPercent(scenario.estimatedDrawdownWithoutHedge)} drawdown, representing a loss of approximately{' '}
              {formatCurrency((MOCK_PORTFOLIO_SUMMARY.totalValueUsd * Math.abs(scenario.estimatedDrawdownWithoutHedge)) / 100)}.
            </p>
            <p className="mt-4 font-manrope text-sm leading-7 text-text-secondary">
              With the BTC/USDT short hedge active at 35% coverage, the estimated drawdown is reduced to{' '}
              {formatPercent(scenario.estimatedDrawdownWithHedge)}, representing hedge effectiveness of {scenario.hedgeEffectiveness}%.
            </p>
            <p className="mt-4 font-manrope text-sm leading-7 text-text-secondary">
              Hedges reduce risk, they do not eliminate it. In rapidly moving markets, protective impact may vary from these estimates.
            </p>
          </GlowCard>
        </div>
      </StressTestSimulator>
    </>
  );
}
