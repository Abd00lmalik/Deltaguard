export type SignalSeverity = 'critical' | 'high' | 'medium' | 'low' | 'positive';

export type SignalCategory =
  | 'etf-flow-pressure'
  | 'macro-treasury-pressure'
  | 'btc-volatility'
  | 'stablecoin-liquidity'
  | 'market-sentiment'
  | 'funding-rate-pressure'
  | 'onchain-risk'
  | 'ssi-momentum'
  | 'news-regime-alert';

export interface MarketSignal {
  id: string;
  category: SignalCategory;
  label: string;
  score: number;
  severity: SignalSeverity;
  confidence: number;
  timestamp: string;
  explanation: string;
  source: string;
  value?: number | string | null;
  unavailableReason?: string | null;
}

export interface CompositeScore {
  value: number | null;
  label: string;
  regime: 'risk-off' | 'caution' | 'neutral' | 'risk-on';
  lastUpdated: string;
}
