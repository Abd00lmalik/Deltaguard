/**
 * DeltaGuard AI — Portfolio Beta & Risk Engine
 * Computes:
 *  - Portfolio Beta vs BTC and ETH
 *  - Volatility sensitivity per asset class
 *  - Stablecoin concentration ratio
 *  - Aave liquidation proximity (health factor 1.0 = liquidation)
 *  - Overall portfolio risk grade
 */

import type { PortfolioAsset } from '@/types/portfolio';

export interface BetaMetrics {
  portfolioBetaBtc: number;    // 0-2+ weighted beta vs BTC
  portfolioBetaEth: number;    // 0-2+ weighted beta vs ETH
  stablecoinRatio: number;     // 0-1, higher = less directional risk
  weightedVolatility: number;  // annualized vol estimate (0-100%)
  riskGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  riskScore: number;           // 0-100
}

export interface LiquidationProximity {
  protocol: string;
  healthFactor: number;        // Aave HF. Below 1.0 = liquidatable
  healthFactorLabel: string;
  distanceToLiquidation: number; // % price drop to trigger liquidation
  severity: 'safe' | 'warning' | 'critical';
}

// Asset class beta and volatility coefficients relative to BTC
// These are deterministic proxies, not ML-predicted betas
const ASSET_BETA_COEFFICIENTS: Record<string, { betaBtc: number; betaEth: number; vol30d: number }> = {
  'BTC':   { betaBtc: 1.00, betaEth: 0.85, vol30d: 60 },
  'WBTC':  { betaBtc: 1.00, betaEth: 0.85, vol30d: 60 },
  'ETH':   { betaBtc: 0.90, betaEth: 1.00, vol30d: 70 },
  'WETH':  { betaBtc: 0.90, betaEth: 1.00, vol30d: 70 },
  'SOL':   { betaBtc: 1.30, betaEth: 1.20, vol30d: 90 },
  'AVAX':  { betaBtc: 1.25, betaEth: 1.15, vol30d: 85 },
  'MATIC': { betaBtc: 1.35, betaEth: 1.25, vol30d: 95 },
  'ARB':   { betaBtc: 1.20, betaEth: 1.10, vol30d: 88 },
  'OP':    { betaBtc: 1.20, betaEth: 1.10, vol30d: 88 },
  'LINK':  { betaBtc: 0.95, betaEth: 0.90, vol30d: 75 },
  'UNI':   { betaBtc: 1.00, betaEth: 0.95, vol30d: 78 },
  'AAVE':  { betaBtc: 1.05, betaEth: 1.00, vol30d: 80 },
  // stETH/wstETH treated like ETH
  'STETH': { betaBtc: 0.88, betaEth: 0.98, vol30d: 70 },
  'WSTETH':{ betaBtc: 0.88, betaEth: 0.98, vol30d: 70 },
  // Stablecoins
  'USDC':  { betaBtc: 0.00, betaEth: 0.00, vol30d: 0.1 },
  'USDT':  { betaBtc: 0.00, betaEth: 0.00, vol30d: 0.1 },
  'DAI':   { betaBtc: 0.00, betaEth: 0.00, vol30d: 0.1 },
};

function getCoefficients(symbol: string) {
  const key = symbol.toUpperCase();
  return ASSET_BETA_COEFFICIENTS[key] ?? { betaBtc: 1.1, betaEth: 1.05, vol30d: 85 }; // Unknown tokens default to high-beta
}

export function calculatePortfolioBeta(assets: PortfolioAsset[]): BetaMetrics {
  const totalValue = assets.reduce((s, a) => s + a.valueUsd, 0);
  if (totalValue === 0) {
    return { portfolioBetaBtc: 0, portfolioBetaEth: 0, stablecoinRatio: 0, weightedVolatility: 0, riskGrade: 'A', riskScore: 0 };
  }

  let weightedBetaBtc = 0;
  let weightedBetaEth = 0;
  let weightedVol = 0;
  let stablecoinValue = 0;

  for (const asset of assets) {
    const w = asset.valueUsd / totalValue;
    const coeff = getCoefficients(asset.symbol);
    weightedBetaBtc += w * coeff.betaBtc;
    weightedBetaEth += w * coeff.betaEth;
    weightedVol += w * coeff.vol30d;
    if (asset.class === 'stablecoin' || coeff.betaBtc === 0) {
      stablecoinValue += asset.valueUsd;
    }
  }

  const stablecoinRatio = stablecoinValue / totalValue;
  
  // Risk score: blend of beta exposure and volatility
  const betaRisk = Math.min(weightedBetaBtc / 2, 1) * 60; // beta 0-2+ maps to 0-60 pts
  const volRisk = Math.min(weightedVol / 100, 1) * 40;    // vol 0-100% maps to 0-40 pts
  const stableDiscount = stablecoinRatio * 25;             // stables reduce risk
  const riskScore = Math.max(0, Math.round(betaRisk + volRisk - stableDiscount));

  const riskGrade: BetaMetrics['riskGrade'] =
    riskScore < 20 ? 'A' :
    riskScore < 40 ? 'B' :
    riskScore < 60 ? 'C' :
    riskScore < 80 ? 'D' : 'F';

  return {
    portfolioBetaBtc: Number(weightedBetaBtc.toFixed(3)),
    portfolioBetaEth: Number(weightedBetaEth.toFixed(3)),
    stablecoinRatio: Number(stablecoinRatio.toFixed(4)),
    weightedVolatility: Number(weightedVol.toFixed(1)),
    riskGrade,
    riskScore,
  };
}

/**
 * Computes Aave liquidation proximity from health factor.
 * Health factor = totalCollateralETH * avgLiquidationThreshold / totalDebtETH
 * When HF < 1.0 → liquidatable.
 * Price drop % to reach HF = 1.0: (1 - 1/HF) * 100
 */
export function computeLiquidationProximity(healthFactor: number): LiquidationProximity {
  const distanceToLiquidation = healthFactor > 1
    ? Number(((1 - 1 / healthFactor) * 100).toFixed(2))
    : 0;

  const severity: LiquidationProximity['severity'] =
    healthFactor < 1.05 ? 'critical' :
    healthFactor < 1.25 ? 'warning' : 'safe';

  const healthFactorLabel =
    healthFactor < 1.0 ? 'LIQUIDATABLE' :
    healthFactor < 1.05 ? 'CRITICAL' :
    healthFactor < 1.25 ? 'WARNING' :
    healthFactor < 2.0 ? 'MODERATE' : 'SAFE';

  return {
    protocol: 'Aave v3',
    healthFactor: Number(healthFactor.toFixed(4)),
    healthFactorLabel,
    distanceToLiquidation,
    severity,
  };
}
