import type { CompositeScore, MarketSignal } from '@/types/signals';

export const MOCK_SIGNALS: MarketSignal[] = [
  {
    id: 'sig-etf-flow',
    category: 'etf-flow-pressure',
    label: 'ETF Flow Pressure',
    score: -80,
    severity: 'critical',
    confidence: 87,
    timestamp: new Date(Date.now() - 12 * 60000).toISOString(),
    explanation:
      'Spot Bitcoin ETF net outflows have exceeded $420M over the past 48 hours. Sustained institutional redemptions indicate risk-off rotation.',
    source: 'Mock SoSoValue Signal Feed'
  },
  {
    id: 'sig-macro-treasury',
    category: 'macro-treasury-pressure',
    label: 'Macro Treasury Pressure',
    score: -67,
    severity: 'high',
    confidence: 79,
    timestamp: new Date(Date.now() - 25 * 60000).toISOString(),
    explanation:
      '10-year Treasury yield rose 18bps intraday, breaking above the 4.8% resistance level. Historical correlation with BTC drawdowns above this level is significant.',
    source: 'Mock SoSoValue Signal Feed'
  },
  {
    id: 'sig-btc-vol',
    category: 'btc-volatility',
    label: 'BTC Volatility Spike',
    score: -74,
    severity: 'critical',
    confidence: 92,
    timestamp: new Date(Date.now() - 8 * 60000).toISOString(),
    explanation:
      'BTC 30-day realized volatility has risen to 68.4%, the highest in 90 days. Options implied volatility skew is negative, suggesting protective put demand.',
    source: 'Mock SoSoValue Signal Feed'
  },
  {
    id: 'sig-stablecoin-liq',
    category: 'stablecoin-liquidity',
    label: 'Stablecoin Liquidity',
    score: -42,
    severity: 'medium',
    confidence: 64,
    timestamp: new Date(Date.now() - 40 * 60000).toISOString(),
    explanation:
      'Stablecoin supply growth has stalled for 14 days. New capital inflows into DeFi protocols have declined 31% week-over-week.',
    source: 'Mock SoSoValue Signal Feed'
  },
  {
    id: 'sig-sentiment',
    category: 'market-sentiment',
    label: 'Market Sentiment',
    score: -65,
    severity: 'high',
    confidence: 73,
    timestamp: new Date(Date.now() - 18 * 60000).toISOString(),
    explanation:
      'Aggregated social sentiment index has entered Fear territory. Crypto-specific Fear and Greed proxy is at 28/100, down from 61 last week.',
    source: 'Mock SoSoValue Signal Feed'
  },
  {
    id: 'sig-funding-rate',
    category: 'funding-rate-pressure',
    label: 'Funding Rate Pressure',
    score: -55,
    severity: 'high',
    confidence: 81,
    timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
    explanation:
      'Perpetual funding rates have turned negative on major venues for BTC and ETH, indicating net short dominance. Cascading liquidation risk elevated.',
    source: 'Mock SoSoValue Signal Feed'
  },
  {
    id: 'sig-onchain-risk',
    category: 'onchain-risk',
    label: 'On-Chain Risk',
    score: -48,
    severity: 'medium',
    confidence: 68,
    timestamp: new Date(Date.now() - 55 * 60000).toISOString(),
    explanation:
      'Large wallet outflows from centralized exchanges have increased 40% in 24 hours. Miner selling pressure is above the 30-day average.',
    source: 'Mock SoSoValue Signal Feed'
  },
  {
    id: 'sig-ssi-momentum',
    category: 'ssi-momentum',
    label: 'SSI Index Momentum',
    score: -61,
    severity: 'high',
    confidence: 76,
    timestamp: new Date(Date.now() - 22 * 60000).toISOString(),
    explanation:
      'ssiMEME and ssiDeFi indices are showing relative weakness versus BTC. Broad index momentum is negative across 5 of 6 tracked SSI benchmarks.',
    source: 'Mock SoSoValue Signal Feed'
  },
  {
    id: 'sig-news-regime',
    category: 'news-regime-alert',
    label: 'News / Regime Alert',
    score: -77,
    severity: 'critical',
    confidence: 85,
    timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
    explanation:
      'Federal Reserve minutes flagged higher-for-longer rate policy continuation. Simultaneous regulatory signals from SEC suggest elevated policy uncertainty for crypto asset classification.',
    source: 'Mock SoSoValue Signal Feed'
  }
];

export const MOCK_COMPOSITE_SCORE: CompositeScore = {
  value: -72,
  label: 'RISK-OFF',
  regime: 'risk-off',
  lastUpdated: new Date().toISOString()
};
