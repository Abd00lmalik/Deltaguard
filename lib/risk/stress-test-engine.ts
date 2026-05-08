import type { PortfolioSummary } from '@/types/portfolio';
import type { StressScenario } from '@/lib/mock/scenarios';

export function runStressTest(
  scenario: StressScenario,
  portfolio: PortfolioSummary,
  hedged: boolean
): number {
  const drawdown = hedged
    ? scenario.estimatedDrawdownWithHedge
    : scenario.estimatedDrawdownWithoutHedge;
  return Number((portfolio.totalValueUsd * (1 + drawdown / 100)).toFixed(2));
}

export function generateStressChartData(
  scenario: StressScenario,
  portfolio: PortfolioSummary
): { time: string; unhedged: number; hedged: number }[] {
  const start = portfolio.totalValueUsd;
  const unhedgedEnd = runStressTest(scenario, portfolio, false);
  const hedgedEnd = runStressTest(scenario, portfolio, true);
  const shockPoint = 4;

  return Array.from({ length: 12 }, (_, index) => {
    const crashWeight = index <= shockPoint ? index / shockPoint : 1;
    const recoveryWeight = index <= shockPoint ? 0 : (index - shockPoint) / 14;
    const unhedged = start + (unhedgedEnd - start) * crashWeight + start * recoveryWeight * 0.06;
    const hedged = start + (hedgedEnd - start) * crashWeight + start * recoveryWeight * 0.035;
    return {
      time: `T+${index}`,
      unhedged: Math.round(unhedged),
      hedged: Math.round(hedged)
    };
  });
}
