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
    requiredSource: "SoSoValue BTC market-snapshot (derived proxy for ETF flow pressure)",
    // Enabled when BTC snapshot data is available — score is derived from BTC 24h price action
    condition: (data: SoSoValueFetchResult) => {
      const s = data?.btcSnapshot as Record<string, unknown> | undefined;
      const inner = (s?.data as Record<string, unknown>) ?? s;
      return Boolean(inner && Object.keys(inner).length > 0);
    },
    derivationNote: "Derived from BTC 24h price momentum as a proxy for institutional ETF flow direction",
  },
  macroTreasuryPressure: {
    requiredSource: "SoSoValue SSI Mega-7 index snapshot (derived macro proxy)",
    // Enabled when index snapshot is available — score derived from index 24h change
    condition: (data: SoSoValueFetchResult) => {
      const s = data?.indexSnapshot as Record<string, unknown> | undefined;
      const inner = (s?.data as Record<string, unknown>) ?? s;
      return Boolean(inner && Object.keys(inner).length > 0);
    },
    derivationNote: "Derived from SSI Mega-7 index momentum as a macro treasury proxy",
  },
  btcVolatility: {
    requiredSource: "SoSoValue BTC market-snapshot",
    // Enabled when BTC snapshot data is available — volatility derived from 24h magnitude
    condition: (data: SoSoValueFetchResult) => {
      const s = data?.btcSnapshot as Record<string, unknown> | undefined;
      const inner = (s?.data as Record<string, unknown>) ?? s;
      return Boolean(inner && Object.keys(inner).length > 0);
    },
    derivationNote: "Computed from BTC 24h price change magnitude as a realized volatility proxy",
  },
  stablecoinLiquidity: {
    requiredSource: "SoSoValue SSI index snapshot (derived stablecoin liquidity proxy)",
    // Enabled when index snapshot is available — liquidity derived from index change direction
    condition: (data: SoSoValueFetchResult) => {
      const s = data?.indexSnapshot as Record<string, unknown> | undefined;
      const inner = (s?.data as Record<string, unknown>) ?? s;
      return Boolean(inner && Object.keys(inner).length > 0);
    },
    derivationNote: "Derived from SSI index flow direction as a stablecoin liquidity proxy",
  },
  marketSentiment: {
    requiredSource: "SoSoValue news/feed data",
    condition: (data: SoSoValueFetchResult) => Boolean(data?.newsList && data.newsList.length > 0),
    derivationNote: "Normalized from news headline keyword analysis and index momentum",
  },
  fundingRatePressure: {
    requiredSource: "SoSoValue BTC market-snapshot (derived funding rate proxy)",
    // Enabled when BTC snapshot is available — funding rate inferred from BTC price direction
    condition: (data: SoSoValueFetchResult) => {
      const s = data?.btcSnapshot as Record<string, unknown> | undefined;
      const inner = (s?.data as Record<string, unknown>) ?? s;
      return Boolean(inner && Object.keys(inner).length > 0);
    },
    derivationNote: "Derived from BTC price action as a proxy for perpetuals funding rate direction",
  },
  onChainRisk: {
    requiredSource: "SoSoValue BTC market-snapshot (derived on-chain risk proxy)",
    // Enabled when BTC snapshot is available — on-chain risk inferred from price and index data
    condition: (data: SoSoValueFetchResult) => {
      const s = data?.btcSnapshot as Record<string, unknown> | undefined;
      const inner = (s?.data as Record<string, unknown>) ?? s;
      return Boolean(inner && Object.keys(inner).length > 0);
    },
    derivationNote: "Derived from BTC price action and index divergence as an on-chain activity proxy",
  },
  ssiIndexMomentum: {
    requiredSource: "SSI Protocol index data — SSI source is not operational (Option C applied)",
    // Kept false: SSI Protocol endpoint is confirmed offline. Index snapshot from SoSoValue
    // does not provide SSI-specific momentum data. Do not enable without a real SSI data source.
    condition: (_data: SoSoValueFetchResult, _ssiData: SSIData | null) => false,
    derivationNote: "From SSI index price momentum — requires live SSI Protocol API",
  },
  newsRegimeAlert: {
    requiredSource: "SoSoValue news/feed data",
    condition: (data: SoSoValueFetchResult) => Boolean(data?.newsList && data.newsList.length > 0),
    derivationNote: "From news headline sentiment scoring and regulatory keyword detection",
  },
};
