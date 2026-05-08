export type AssetClass = 'spot' | 'index' | 'stablecoin' | 'perpetual';

export interface PortfolioAsset {
  id: string;
  symbol: string;
  name: string;
  class: AssetClass;
  amount: number;
  priceUsd: number;
  valueUsd: number;
  delta: number;
  volatility30d: number;
  riskContribution: number;
  allocation: number;
}

export interface PortfolioSummary {
  totalValueUsd: number;
  netDeltaExposure: number;
  hedgeCoverage: number;
  riskScore: number;
  lastUpdated: string;
}
