/**
 * TERMINAL ROUTE — LIVE DATA ONLY
 * Returns real external API data or honest error states.
 * Does not fall back to mock data silently.
 * 
 * Intelligence sources (all parallel):
 *   - SoSoValue: ETF flows, index snapshots, news regime
 *   - Binance Premium Index: BTC/ETH perpetual funding rates
 *   - Deribit: DVOL implied volatility index + options put/call skew
 *   - Hyperliquid: Orderbook bid/ask imbalance + OI-weighted funding
 */

import { NextResponse } from 'next/server';
import { getSoSoValueData } from '@/lib/integrations/sosovalue/provider';
import { normalizeSoSoValueData } from '@/lib/integrations/sosovalue/normalizer';
import { calculateCompositeScore } from '@/lib/integrations/sosovalue/server-client';
import { fetchBtcEthFundingRates } from '@/lib/integrations/coinglass/client';
import { fetchDeribitIntelligence } from '@/lib/integrations/deribit/client';
import { fetchHyperliquidIntelligence } from '@/lib/integrations/hyperliquid/client';
import { parseRiskProfile } from '@/lib/config/signal-weights';
import { withTelemetry } from '@/lib/telemetry/middleware';
import type { SignalMetadata } from '@/lib/types/signal-source';
import type { MarketSignal } from '@/types/signals';

async function handler(request: Request) {
  const riskProfile = parseRiskProfile(
    new URL(request.url).searchParams.get('profile') ??
    request.headers.get('x-risk-profile')
  );

  const [sosoData, fundingRates, deribitData, hyperliquidData] = await Promise.all([
    getSoSoValueData(),
    fetchBtcEthFundingRates().catch((err) => {
      console.warn('Failed to fetch funding rates in signals api:', err);
      return undefined;
    }),
    fetchDeribitIntelligence().catch((err) => {
      console.warn('Failed to fetch Deribit intelligence:', err);
      return undefined;
    }),
    fetchHyperliquidIntelligence().catch((err) => {
      console.warn('Failed to fetch Hyperliquid intelligence:', err);
      return undefined;
    }),
  ]);

  if (!sosoData.available && sosoData.providerHealth === 'setup_required') {
    return NextResponse.json(
      {
        error: 'SoSoValue credentials not configured',
        code: 'SOSOVALUE_NOT_CONFIGURED',
        setup: 'Set SOSOVALUE_API_KEY and SOSOVALUE_BASE_URL in your environment.',
        metadata: {
          source: 'unavailable',
          providerHealth: 'setup_required',
          dataSourcesUsed: [],
          lastUpdated: sosoData.lastUpdated,
          errors: sosoData.errors,
        } satisfies SignalMetadata,
      },
      { status: 503 }
    );
  }

  const signals = normalizeSoSoValueData(
    sosoData,
    null,
    fundingRates || undefined,
    deribitData || undefined,
    hyperliquidData || undefined,
    riskProfile
  );
  const compositeScore = calculateCompositeScore(signals, riskProfile);

  const unavailableCount = signals.filter((s: MarketSignal) => s.source === 'unavailable' || s.value === null).length;
  const availableCount = signals.length - unavailableCount;

  // Build data sources list
  const dataSourcesUsed: string[] = [
    sosoData.newsList?.length > 0 ? 'SoSoValue /news' : null,
    sosoData.indexSnapshot && Object.keys(sosoData.indexSnapshot).length > 0 ? 'SoSoValue /indices/ssimag7/market-snapshot' : null,
    sosoData.btcSnapshot && Object.keys(sosoData.btcSnapshot).length > 0 ? 'SoSoValue BTC snapshot' : null,
    fundingRates ? 'Binance Premium Index (BTC/ETH perp funding)' : null,
    deribitData?.source === 'live' ? `Deribit DVOL (BTC: ${deribitData.btcVol?.dvolIndex}, ETH: ${deribitData.ethVol?.dvolIndex})` : null,
    hyperliquidData?.source === 'live' ? `Hyperliquid orderbook (BTC imbalance: ${hyperliquidData.btcOrderbook?.imbalanceRatio?.toFixed(3)})` : null,
  ].filter(Boolean) as string[];

  const metadata: SignalMetadata = {
    source: sosoData.source,
    providerHealth: sosoData.providerHealth,
    dataSourcesUsed,
    lastUpdated: sosoData.lastUpdated,
    errors: sosoData.errors,
    ...(sosoData.source === 'cached' ? { cacheAgeSeconds: sosoData.cacheAgeSeconds } : {}),
  };

  if (!sosoData.available) {
    return NextResponse.json(
      {
        error: sosoData.errors[0]?.message ?? 'SoSoValue API unreachable',
        code: 'SOSOVALUE_FETCH_FAILED',
        signals: [],
        compositeScore: null,
        metadata,
      },
      { status: 502 }
    );
  }

  let compositeLabel = 'UNAVAILABLE';
  let compositeRegime: 'risk-off' | 'caution' | 'neutral' | 'risk-on' = 'neutral';
  if (compositeScore !== null) {
    if (compositeScore < -50) { compositeLabel = 'RISK-OFF'; compositeRegime = 'risk-off'; }
    else if (compositeScore <= 20) { compositeLabel = 'CAUTION'; compositeRegime = 'caution'; }
    else { compositeLabel = 'RISK-ON'; compositeRegime = 'risk-on'; }
  }

  return NextResponse.json({
    signals,
    composite: {
      value: compositeScore,
      label: compositeLabel,
      regime: compositeRegime,
      lastUpdated: sosoData.lastUpdated,
    },
    metadata,
    intelligence: {
      deribit: {
        btcDvol: deribitData?.btcVol ?? null,
        ethDvol: deribitData?.ethVol ?? null,
        btcSkew: deribitData?.btcSkew ?? null,
        ethSkew: deribitData?.ethSkew ?? null,
        source: deribitData?.source ?? 'unavailable',
      },
      hyperliquid: {
        btcFunding: hyperliquidData?.btcFunding ?? null,
        ethFunding: hyperliquidData?.ethFunding ?? null,
        btcOrderbook: hyperliquidData?.btcOrderbook ?? null,
        ethOrderbook: hyperliquidData?.ethOrderbook ?? null,
        source: hyperliquidData?.source ?? 'unavailable',
      },
      riskProfile,
    },
    summary: {
      total: signals.length,
      available: availableCount,
      unavailable: unavailableCount,
    },
    fetchedAt: sosoData.lastUpdated,
  });
}

export const GET = withTelemetry('/api/terminal/signals', handler);
export const dynamic = 'force-dynamic';
