// Future SSI Protocol API response types.

export interface SSIIndexCompositionResponse {
  indexSymbol: string;
  navUsd: number;
  holdings: unknown[];
  rebalancedAt: string;
}

export interface SSIPortfolioPositionResponse {
  walletAddress: string;
  positions: unknown[];
  generatedAt: string;
}
