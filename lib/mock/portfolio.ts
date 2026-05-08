import type { PortfolioAsset, PortfolioSummary } from '@/types/portfolio';

export const MOCK_PORTFOLIO_ASSETS: PortfolioAsset[] = [
  {
    id: 'btc',
    symbol: 'BTC',
    name: 'Bitcoin',
    class: 'spot',
    amount: 0.85,
    priceUsd: 63400,
    valueUsd: 53890,
    delta: 0.92,
    volatility30d: 48.2,
    riskContribution: 38.4,
    allocation: 43.1
  },
  {
    id: 'eth',
    symbol: 'ETH',
    name: 'Ethereum',
    class: 'spot',
    amount: 6.4,
    priceUsd: 3210,
    valueUsd: 20544,
    delta: 0.78,
    volatility30d: 52.7,
    riskContribution: 24.6,
    allocation: 16.4
  },
  {
    id: 'ssimag7',
    symbol: 'ssiMAG7',
    name: 'SSI Magnificent 7 Index',
    class: 'index',
    amount: 220,
    priceUsd: 88.4,
    valueUsd: 19448,
    delta: 0.65,
    volatility30d: 34.1,
    riskContribution: 15.2,
    allocation: 15.5
  },
  {
    id: 'ssimeme',
    symbol: 'ssiMEME',
    name: 'SSI Meme Index',
    class: 'index',
    amount: 1800,
    priceUsd: 7.22,
    valueUsd: 12996,
    delta: 0.95,
    volatility30d: 118.4,
    riskContribution: 16.8,
    allocation: 10.4
  },
  {
    id: 'ssidefi',
    symbol: 'ssiDeFi',
    name: 'SSI DeFi Index',
    class: 'index',
    amount: 950,
    priceUsd: 12.61,
    valueUsd: 11979.5,
    delta: 0.72,
    volatility30d: 61.3,
    riskContribution: 5.0,
    allocation: 9.6
  },
  {
    id: 'usdc',
    symbol: 'USDC',
    name: 'USD Coin',
    class: 'stablecoin',
    amount: 6500,
    priceUsd: 1.0,
    valueUsd: 6500,
    delta: 0,
    volatility30d: 0.1,
    riskContribution: 0,
    allocation: 5.2
  }
];

export const MOCK_PORTFOLIO_SUMMARY: PortfolioSummary = {
  totalValueUsd: 125357.5,
  netDeltaExposure: 0.81,
  hedgeCoverage: 0,
  riskScore: 74,
  lastUpdated: new Date().toISOString()
};
