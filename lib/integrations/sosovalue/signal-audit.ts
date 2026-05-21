/**
 * DeltaGuard AI - SoSoValue Signal Integrity Audit
 * 
 * AUDIT FINDINGS:
 * - Previously, signals were returned as "SoSoValue Real-Time OpenAPI" even when APIs failed and fallbacks were used.
 * - This file establishes strict condition checks for each signal. If the underlying API fields are absent,
 *   the signal is marked "unavailable" with value null, preventing false positive telemetry.
 */

import type { SoSoValueFetchResult } from './provider';

export interface SSIData {
  available: boolean;
  message?: string;
  indexExposure?: unknown;
  indexDelta?: unknown;
}

export const SIGNAL_DISPLAY_NAMES: Record<string, string> = {
  etfFlowPressure: 'ETF Flow Pressure',
  macroTreasuryPressure: 'Macro Treasury Pressure',
  btcVolatility: 'BTC Volatility',
  stablecoinLiquidity: 'Stablecoin Liquidity',
  marketSentiment: 'Market Sentiment',
  fundingRatePressure: 'Funding Rate Pressure',
  onChainRisk: 'On-Chain Risk',
  ssiIndexMomentum: 'SSI Index Momentum',
  newsRegimeAlert: 'News / Regime Alert'
};

export const SIGNAL_INTEGRITY_MAP = {
  etfFlowPressure: {
    requiredSource: "SoSoValue ETF/market flow data",
    condition: (_data: SoSoValueFetchResult) => false,
    derivationNote: "Derived from ETF net flow direction and magnitude",
  },
  macroTreasuryPressure: {
    requiredSource: "SoSoValue macro/treasury data or proxy",
    condition: (_data: SoSoValueFetchResult) => false,
    derivationNote: "If derived from a proxy (e.g. price correlation), label as derived",
  },
  btcVolatility: {
    requiredSource: "SoSoValue BTC price/volume data",
    condition: (_data: SoSoValueFetchResult) => false,
    derivationNote: "Computed from rolling BTC price change over available window",
  },
  stablecoinLiquidity: {
    requiredSource: "SoSoValue stablecoin market data",
    condition: (_data: SoSoValueFetchResult) => false,
    derivationNote: "Derived from stablecoin supply/flow data",
  },
  marketSentiment: {
    requiredSource: "SoSoValue sentiment or news data",
    condition: (data: SoSoValueFetchResult) => Boolean(data?.newsList && data.newsList.length > 0),
    derivationNote: "Normalized from news/sentiment endpoints",
  },
  fundingRatePressure: {
    requiredSource: "SoDEX or SoSoValue funding rate data",
    condition: (_data: SoSoValueFetchResult) => false,
    derivationNote: "From perpetual funding rate data",
  },
  onChainRisk: {
    requiredSource: "On-chain metrics from SoSoValue or public RPC",
    condition: (_data: SoSoValueFetchResult) => false,
    derivationNote: "From on-chain activity data",
  },
  ssiIndexMomentum: {
    requiredSource: "SSI index data — requires SSI source",
    condition: (_data: SoSoValueFetchResult, _ssiData: SSIData | null) => false,
    derivationNote: "From SSI index price momentum",
  },
  newsRegimeAlert: {
    requiredSource: "SoSoValue news/feed data",
    condition: (data: SoSoValueFetchResult) => Boolean(data?.newsList && data.newsList.length > 0),
    derivationNote: "From news sentiment scoring",
  },
};
