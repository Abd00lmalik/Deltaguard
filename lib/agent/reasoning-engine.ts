import type { AgentReasoningOutput } from '@/types/agent';

export function buildReasoningNarrative(output: AgentReasoningOutput): string[] {
  if (output.decision === 'hedge' && output.hedgeRecommendation) {
    const rec = output.hedgeRecommendation;
    return [
      `The composite signal score of ${output.compositeScore} places the market in a defensive, risk-off regime. Active risk metrics suggest immediate hedging action is warranted based on prevailing macroeconomic and market indicators.`,
      `The portfolio has a net delta of ${output.portfolioDelta.toFixed(2)}, indicating significant directional exposure to crypto market drawdowns. The recommended hedge proposes opening a ${rec.leverage}x ${rec.direction} position on ${rec.pair} for a notional value of $${rec.notionalUsd.toLocaleString()} (${rec.sizePercent}% of portfolio size).`,
      `This recommendation requires user confirmation before execution. DeltaGuard AI enforces strict authorization gates, ensuring that no trade is dispatched to the execution gateway without explicit cryptographic approval.`
    ];
  }

  if (output.decision === 'watch') {
    return [
      `The composite signal score of ${output.compositeScore} is below the threshold required to initiate a new hedge. Market parameters are currently stable.`,
      `The portfolio delta of ${output.portfolioDelta.toFixed(2)} is monitored continuously against directional risk rules. The agent remains in monitoring mode to capture any volatility spikes.`,
      `No hedging action is proposed at this time. Telemetry and signal pipelines continue to feed updates to the decision matrix.`
    ];
  }

  return [
    `The market signal score of ${output.compositeScore} does not warrant defensive action. Risk profiles indicate standard exposure limits.`,
    `No hedging parameters have been exceeded. The portfolio maintains a net delta of ${output.portfolioDelta.toFixed(2)}.`,
    `System is active and scanning signals. Manual confirmation will remain required for any operational state updates.`
  ];
}

