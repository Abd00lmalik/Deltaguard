import type { AgentReasoningOutput } from '@/types/agent';

export function buildReasoningNarrative(output: AgentReasoningOutput): string[] {
  if (output.decision === 'hedge' && output.hedgeRecommendation) {
    return [
      `The composite signal score of ${output.compositeScore} places the market in a risk-off regime. Multiple mock SoSoValue-style inputs are pointing in the same direction: ETF outflows, macro pressure, volatility expansion, and weakening SSI momentum.`,
      `The portfolio has a net delta of ${output.portfolioDelta.toFixed(2)}, which means it is heavily exposed to directional crypto drawdowns. The proposed hedge is partial by design; it aims to reduce downside impact without claiming full protection.`,
      `The recommendation requires user approval before any simulated execution can occur. DeltaGuard AI never auto-executes, never touches real funds, and never presents mock execution as live trading.`
    ];
  }

  if (output.decision === 'watch') {
    return [
      'The composite signal score is not severe enough to justify a hedge under the current rule set.',
      'The agent remains in watch mode and continues surfacing the risk factors that could change the recommendation.',
      'No simulated order is created unless the hedge threshold and portfolio delta rules are both satisfied.'
    ];
  }

  return [
    'The market signal score is not in a defensive regime under the current deterministic rule set.',
    'No hedge is proposed. If an existing hedge were active, a future production system could recommend reducing it after user review.',
    'Manual confirmation remains mandatory for every execution-related action.'
  ];
}
