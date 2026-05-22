/**
 * DeltaGuard AI — Signal Weight Configuration
 * Configurable per-signal weights for three risk profiles.
 * Loaded at runtime — no rebuild needed when user switches profile.
 */

export type RiskProfile = 'conservative' | 'balanced' | 'aggressive';

export const RISK_PROFILE_LABELS: Record<RiskProfile, string> = {
  conservative: 'Conservative — Low risk tolerance. Higher weight on bearish signals.',
  balanced:     'Balanced — Default weighting. Symmetric risk assessment.',
  aggressive:   'Aggressive — Lower weight on bearish signals. Higher threshold for hedging.',
};

/**
 * Weight multipliers per signal category per risk profile.
 * Higher weight = signal has more influence on composite score.
 * Baseline (balanced) = 1.0.
 */
export const SIGNAL_WEIGHTS: Record<RiskProfile, Record<string, number>> = {
  conservative: {
    'etf-flow-pressure':     1.4,
    'macro-treasury-pressure': 1.3,
    'btc-volatility':        1.5,
    'stablecoin-liquidity':  1.1,
    'market-sentiment':      1.0,
    'funding-rate-pressure': 1.3,
    'onchain-risk':          1.2,
    'ssi-momentum':          0.8,
    'news-regime-alert':     1.2,
    'options-skew':          1.4,
    'orderbook-imbalance':   1.1,
  },
  balanced: {
    'etf-flow-pressure':     1.0,
    'macro-treasury-pressure': 1.0,
    'btc-volatility':        1.0,
    'stablecoin-liquidity':  1.0,
    'market-sentiment':      1.0,
    'funding-rate-pressure': 1.0,
    'onchain-risk':          1.0,
    'ssi-momentum':          1.0,
    'news-regime-alert':     1.0,
    'options-skew':          1.0,
    'orderbook-imbalance':   1.0,
  },
  aggressive: {
    'etf-flow-pressure':     0.7,
    'macro-treasury-pressure': 0.7,
    'btc-volatility':        0.6,
    'stablecoin-liquidity':  0.9,
    'market-sentiment':      0.8,
    'funding-rate-pressure': 0.8,
    'onchain-risk':          0.7,
    'ssi-momentum':          1.1,
    'news-regime-alert':     0.7,
    'options-skew':          0.7,
    'orderbook-imbalance':   0.8,
  },
};

// Hedge decision thresholds per risk profile
export const HEDGE_THRESHOLDS: Record<RiskProfile, { hedge: number; watch: number }> = {
  conservative: { hedge: -35, watch: 10 },
  balanced:     { hedge: -50, watch: 20 },
  aggressive:   { hedge: -65, watch: 35 },
};

export function getSignalWeight(profile: RiskProfile, category: string): number {
  return SIGNAL_WEIGHTS[profile][category] ?? 1.0;
}

export function getHedgeThreshold(profile: RiskProfile): { hedge: number; watch: number } {
  return HEDGE_THRESHOLDS[profile];
}

export function parseRiskProfile(raw: string | null | undefined): RiskProfile {
  if (raw === 'conservative' || raw === 'balanced' || raw === 'aggressive') return raw;
  return 'balanced';
}
