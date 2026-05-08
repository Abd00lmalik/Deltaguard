export type AgentDecision = 'hedge' | 'watch' | 'reduce-hedge' | 'no-action';

export interface HedgeRecommendation {
  pair: string;
  direction: 'short' | 'long';
  leverage: number;
  sizePercent: number;
  notionalUsd: number;
  rationale: string;
}

export interface AgentReasoningOutput {
  decision: AgentDecision;
  compositeScore: number;
  portfolioDelta: number;
  confidence: number;
  reasoningSteps: string[];
  reasoningNarrative: string[];
  decisionRule: string;
  hedgeRecommendation: HedgeRecommendation | null;
  warnings: string[];
  refusals: string[];
  requiresConfirmation: boolean;
}
