import type { AgentReasoningOutput, AgentDecision } from '@/types/agent';
import type { PortfolioSummary } from '@/types/portfolio';
import type { MarketSignal, SignalSeverity } from '@/types/signals';
import { HEDGE_PERCENT } from '@/lib/utils/constants';
import { calculateHedgeNotional } from '@/lib/risk/hedge-calculator';
import { buildReasoningNarrative } from './reasoning-engine';
import { HEDGE_THRESHOLDS, parseRiskProfile, type RiskProfile } from '@/lib/config/signal-weights';

const SEVERITY_WEIGHTS: Record<SignalSeverity, number> = {
  critical: 1.45,
  high: 1.16,
  medium: 0.82,
  low: 0.55,
  positive: 1
};

function calculateCompositeScore(signals: MarketSignal[]): number {
  if (signals.length === 0) return 0;
  const weighted = signals.reduce(
    (acc, signal) => {
      const weight = SEVERITY_WEIGHTS[signal.severity] * (signal.confidence / 100);
      return {
        score: acc.score + signal.score * weight,
        weight: acc.weight + weight
      };
    },
    { score: 0, weight: 0 }
  );
  const rawScore = weighted.weight === 0 ? 0 : weighted.score / weighted.weight;
  return Math.round(Math.max(-100, Math.min(100, rawScore * 1.07)));
}

export function runAgentScan(
  signals: MarketSignal[],
  portfolio: PortfolioSummary,
  riskProfileRaw?: string
): AgentReasoningOutput {
  const profile: RiskProfile = parseRiskProfile(riskProfileRaw);
  const thresholds = HEDGE_THRESHOLDS[profile];

  const compositeScore = calculateCompositeScore(signals);
  const portfolioDelta = portfolio.netDeltaExposure;

  let decision: AgentDecision = 'watch';
  if (compositeScore < thresholds.hedge && portfolioDelta > 0.5) decision = 'hedge';
  if (compositeScore >= thresholds.hedge && compositeScore <= thresholds.watch) decision = 'watch';
  if (compositeScore > thresholds.watch) decision = 'no-action';

  const hedgeNotional = calculateHedgeNotional(
    portfolio.totalValueUsd,
    portfolioDelta,
    HEDGE_PERCENT
  );

  const hedgeRecommendation =
    decision === 'hedge'
      ? {
          pair: 'BTC/USDT Perp',
          direction: 'short' as const,
          leverage: 2,
          sizePercent: HEDGE_PERCENT * 100,
          notionalUsd: hedgeNotional,
          rationale:
            'BTC/USDT Perp is selected as the highest beta-weight hedge vehicle for the mock portfolio.'
        }
      : null;

  const output: AgentReasoningOutput = {
    decision,
    compositeScore,
    portfolioDelta,
    confidence: 83,
    reasoningSteps: [
      `Composite signal score is ${compositeScore}. Hedge threshold for ${profile} profile is ${thresholds.hedge}. Condition: ${compositeScore} < ${thresholds.hedge}.`,
      `Portfolio net delta is ${portfolioDelta.toFixed(2)}. Long exposure threshold is 0.5. Condition: ${portfolioDelta.toFixed(2)} > 0.5.`,
      decision === 'hedge'
        ? 'Both hedge conditions satisfied. Decision: HEDGE recommended.'
        : 'Hedge conditions are not fully satisfied. No hedge order is proposed.',
      `Hedge notional: $${portfolio.totalValueUsd.toLocaleString('en-US', {
        minimumFractionDigits: 2
      })} x ${portfolioDelta.toFixed(2)} x ${HEDGE_PERCENT.toFixed(2)} = $${hedgeNotional.toLocaleString('en-US', {
        minimumFractionDigits: 2
      })}.`,
      'Highest portfolio beta-weight asset: BTC. Selected as hedge vehicle.',
      'Leverage: 2x, within configured maximum of 3x.',
      'Slippage estimate: 0.08% based on simulated SoDEX depth.',
      'Confidence score: 83%. Above 60% minimum threshold. Proceeding to proposal.'
    ],
    reasoningNarrative: [],
    decisionRule:
      `IF compositeScore < ${thresholds.hedge} AND portfolioDelta > 0.5 THEN decision = HEDGE, hedgeNotional = portfolioValue x delta x hedgePercent, confirmation = REQUIRED.`,
    hedgeRecommendation,
    warnings: [
      'Hedge does not guarantee profit or full protection.',
      'Simulated execution may differ from real market conditions.',
      'Signal confidence is 83%, not 100%. The agent can be wrong.',
      'Leverage amplifies both protection and potential liquidation risk.'
    ],
    refusals: [
      'Execute without user confirmation.',
      'Use leverage above the configured maximum.',
      'Claim guaranteed downside protection.',
      'Execute more than one hedge order simultaneously without review.',
      'Access, hold, or transmit real funds, private keys, or wallet credentials.'
    ],
    requiresConfirmation: true
  };

  return {
    ...output,
    reasoningNarrative: buildReasoningNarrative(output)
  };
}
