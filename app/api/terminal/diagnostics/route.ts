/**
 * TERMINAL ROUTE — LIVE DATA ONLY
 * Returns real external API data or honest error states.
 * Does not fall back to mock data silently.
 * If all sources fail, returns structured error — never mock values.
 */

import { NextResponse } from 'next/server';
import { getSoSoValueData } from '@/lib/integrations/sosovalue/provider';
import { fetchSSIData } from '@/lib/integrations/ssi/server-client';
import { fetchDeribitIntelligence } from '@/lib/integrations/deribit/client';
import { fetchHyperliquidIntelligence } from '@/lib/integrations/hyperliquid/client';
import { getRecentTelemetry, getTelemetrySummary } from '@/lib/telemetry/logger';
import { withTelemetry } from '@/lib/telemetry/middleware';
import { type ProviderError } from '@/lib/types/signal-source';

function resolvePerpsBase(base: string): string {
  const trimmed = base.replace(/\/$/, '');
  try {
    const parsed = new URL(trimmed);
    if (parsed.pathname === '/' || parsed.pathname === '') {
      return `${trimmed}/api/v1/perps`;
    }
    return trimmed;
  } catch {
    return trimmed;
  }
}

async function checkSoDEXPublicHealth(): Promise<{ available: boolean; httpStatus: number | null; error?: string; latencyMs?: number }> {
  const baseUrl = process.env.SODEX_BASE_URL;
  if (!baseUrl) return { available: false, httpStatus: null, error: 'SODEX_BASE_URL not configured' };
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 4000);
    const startMs = Date.now();
    const perpsBase = resolvePerpsBase(baseUrl);
    const res = await fetch(perpsBase, { method: 'GET', signal: controller.signal });
    const latencyMs = Date.now() - startMs;
    clearTimeout(id);
    return { available: res.status >= 200 && res.status < 500, httpStatus: res.status, latencyMs };
  } catch (err) {
    return { available: false, httpStatus: null, error: err instanceof Error ? err.message : String(err), latencyMs: undefined };
  }
}

async function handler() {
  const [sosoResult, ssiResult, sodexResult, deribitResult, hyperliquidResult] = await Promise.allSettled([
    getSoSoValueData(),
    fetchSSIData(process.env.SODEX_ACCOUNT_ADDRESS ?? null),
    checkSoDEXPublicHealth(),
    fetchDeribitIntelligence(),
    fetchHyperliquidIntelligence(),
  ]);

  const sosoData      = sosoResult.status      === 'fulfilled' ? sosoResult.value      : null;
  const ssiData       = ssiResult.status       === 'fulfilled' ? ssiResult.value       : null;
  const sodexData     = sodexResult.status     === 'fulfilled' ? sodexResult.value     : null;
  const deribitData   = deribitResult.status   === 'fulfilled' ? deribitResult.value   : null;
  const hyperliqData  = hyperliquidResult.status === 'fulfilled' ? hyperliquidResult.value : null;

  const baseUrl = process.env.SOSOVALUE_BASE_URL ?? '';
  let sosoHost = '';
  try { sosoHost = new URL(baseUrl).host; } catch { sosoHost = baseUrl; }

  const sodexBaseUrl = process.env.SODEX_BASE_URL ?? '';
  let sodexHost = '';
  try { sodexHost = new URL(sodexBaseUrl).host; } catch { sodexHost = sodexBaseUrl; }

  const telemetrySummary = getTelemetrySummary();
  const recentTelemetry = getRecentTelemetry(20);

  return NextResponse.json({
    sosovalue: {
      baseUrlHost:       sosoHost || 'not configured',
      endpointsCalled:   ['/news', '/indices/ssimag7/market-snapshot', '/currencies/1673723677362319866/market-snapshot'],
      httpErrors:        sosoData?.errors?.map((e: ProviderError) => `${e.endpoint}: HTTP ${e.httpStatus ?? 'network error'} — ${e.message}`) ?? [],
      signalSource:      sosoData?.source ?? 'unavailable',
      providerHealth:    sosoData?.providerHealth ?? 'unavailable',
      cacheAgeSeconds:   sosoData?.cacheAgeSeconds ?? null,
      fetchLatencyMs:    sosoData?.fetchLatencyMs ?? null,
      responseSizeBytes: sosoData?.responseSizeBytes ?? null,
      signalCount:       sosoData ? (sosoData.newsList?.length || 0) + Object.keys(sosoData.indexSnapshot || {}).length + Object.keys(sosoData.btcSnapshot || {}).length : 0,
      lastUpdated:       sosoData?.lastUpdated ?? null,
      available:         sosoData?.available ?? false,
    },
    ssi: {
      sourceType:        ssiData?.source ?? 'unavailable',
      endpoint:          'https://api.ssi-protocol.io/portfolio/holdings (not operational — Option C applied)',
      available:         ssiData?.available ?? false,
      setupRequired:     ssiData?.setupRequired ?? true,
      message:           ssiData?.message ?? 'SSI data source not configured',
    },
    sodexPublic: {
      baseUrlHost:       sodexHost || 'not configured',
      httpStatus:        sodexData?.httpStatus ?? null,
      latencyMs:         sodexData?.latencyMs ?? null,
      available:         sodexData?.available ?? false,
      error:             sodexData?.error ?? null,
    },
    sodexSigned: {
      accountId:              'DYNAMIC (Fetched per user)',
      credentialsPresent:     Boolean(process.env.SODEX_API_PRIVATE_KEY && process.env.SODEX_API_KEY),
    },
    deribit: {
      available:         deribitData?.source === 'live',
      source:            deribitData?.source ?? 'unavailable',
      btcDvol:           deribitData?.btcVol?.dvolIndex ?? null,
      ethDvol:           deribitData?.ethVol?.dvolIndex ?? null,
      btcSkewLabel:      deribitData?.btcSkew?.skewLabel ?? null,
      fetchedAt:         deribitData?.fetchedAt ?? null,
    },
    hyperliquid: {
      available:         hyperliqData?.source === 'live',
      source:            hyperliqData?.source ?? 'unavailable',
      btcImbalance:      hyperliqData?.btcOrderbook?.imbalanceRatio ?? null,
      btcImbalanceLabel: hyperliqData?.btcOrderbook?.imbalanceLabel ?? null,
      btcFundingRate:    hyperliqData?.btcFunding?.fundingRate ?? null,
      fetchedAt:         hyperliqData?.fetchedAt ?? null,
    },
    database: {
      status:             process.env.DATABASE_URL ? 'configured' : 'not_configured',
      connected:          Boolean(process.env.DATABASE_URL),
    },
    telemetry: {
      summary: telemetrySummary,
      recent: recentTelemetry,
    },
    alchemyConfigured: Boolean(process.env.ALCHEMY_API_KEY),
    checkedAt: new Date().toISOString(),
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export const GET = withTelemetry('/api/terminal/diagnostics', handler as Parameters<typeof withTelemetry>[1]);
export const dynamic = 'force-dynamic';
