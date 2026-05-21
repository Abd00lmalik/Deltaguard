/**
 * TERMINAL ROUTE — LIVE DATA ONLY
 * Returns real external API data or honest error states.
 * Does not fall back to mock data silently.
 *
 * AUDIT FINDINGS:
 * - Previous signals route hardcoded `source: 'live'` regardless of whether API calls succeeded.
 * - It also duplicated fetching — the health route ran its own independent fetch, so both
 *   could disagree (one caching a failed state, the other re-fetching and succeeding).
 * - Fix: both this route and the health route now call getSoSoValueData() which shares a 30s cache.
 * - The returned `metadata.source` tells the UI exactly what kind of data it received.
 */

import { NextResponse } from 'next/server';
import { getSoSoValueData } from '@/lib/integrations/sosovalue/provider';
import { normalizeSoSoValueData } from '@/lib/integrations/sosovalue/normalizer';
import { calculateCompositeScore } from '@/lib/integrations/sosovalue/server-client';
import type { SignalMetadata } from '@/lib/types/signal-source';
import type { MarketSignal } from '@/types/signals';

export async function GET() {
  const sosoData = await getSoSoValueData();

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

  const signals = normalizeSoSoValueData(sosoData, null);
  const compositeScore = calculateCompositeScore(signals);

  const unavailableCount = signals.filter((s: MarketSignal) => s.source === 'unavailable' || s.value === null).length;
  const availableCount = signals.length - unavailableCount;

  const metadata: SignalMetadata = {
    source: sosoData.source,
    providerHealth: sosoData.providerHealth,
    dataSourcesUsed: [
      sosoData.newsList?.length > 0 ? 'SoSoValue /news' : null,
      sosoData.indexSnapshot && Object.keys(sosoData.indexSnapshot).length > 0 ? 'SoSoValue /indices/ssimag7/market-snapshot' : null,
      sosoData.btcSnapshot && Object.keys(sosoData.btcSnapshot).length > 0 ? 'SoSoValue /currencies/1673723677362319866/market-snapshot' : null,
    ].filter(Boolean) as string[],
    lastUpdated: sosoData.lastUpdated,
    errors: sosoData.errors,
    ...(sosoData.source === 'cached' ? { cacheAgeSeconds: sosoData.cacheAgeSeconds } : {}),
  };

  // If SoSoValue totally unavailable and still no signals, return descriptive error
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

  // Build composite score info
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
    summary: {
      total: signals.length,
      available: availableCount,
      unavailable: unavailableCount,
    },
    fetchedAt: sosoData.lastUpdated,
  });
}

export const dynamic = 'force-dynamic';
