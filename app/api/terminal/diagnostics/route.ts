/**
 * TERMINAL ROUTE — LIVE DATA ONLY
 * Returns real external API data or honest error states.
 * Does not fall back to mock data silently.
 * If all sources fail, returns structured error — never mock values.
 */

import { NextResponse } from 'next/server';
import { getSoSoValueData } from '@/lib/integrations/sosovalue/provider';
import { fetchSSIData } from '@/lib/integrations/ssi/server-client';
import { type ProviderError } from '@/lib/types/signal-source';

async function checkSoDEXPublicHealth(): Promise<{ available: boolean; httpStatus: number | null; error?: string }> {
  const baseUrl = process.env.SODEX_BASE_URL;
  if (!baseUrl) return { available: false, httpStatus: null, error: 'SODEX_BASE_URL not configured' };
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(baseUrl, { method: 'GET', signal: controller.signal });
    clearTimeout(id);
    return { available: res.status >= 200 && res.status < 500, httpStatus: res.status };
  } catch (err) {
    return { available: false, httpStatus: null, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function GET() {
  const [sosoResult, ssiResult, sodexResult] = await Promise.allSettled([
    getSoSoValueData(),
    fetchSSIData(process.env.SODEX_ACCOUNT_ADDRESS ?? null),
    checkSoDEXPublicHealth(),
  ]);

  const sosoData  = sosoResult.status  === 'fulfilled' ? sosoResult.value  : null;
  const ssiData   = ssiResult.status   === 'fulfilled' ? ssiResult.value   : null;
  const sodexData = sodexResult.status === 'fulfilled' ? sodexResult.value : null;

  const baseUrl = process.env.SOSOVALUE_BASE_URL ?? '';
  // Show host only, strip query params or auth tokens
  let sosoHost = '';
  try { sosoHost = new URL(baseUrl).host; } catch { sosoHost = baseUrl; }

  const sodexBaseUrl = process.env.SODEX_BASE_URL ?? '';
  let sodexHost = '';
  try { sodexHost = new URL(sodexBaseUrl).host; } catch { sodexHost = sodexBaseUrl; }

  return NextResponse.json({
    sosovalue: {
      baseUrlHost:       sosoHost || 'not configured',
      endpointsCalled:   ['/news', '/indices/ssimag7/market-snapshot', '/currencies/1673723677362319866/market-snapshot'],
      httpErrors:        sosoData?.errors?.map((e: ProviderError) => `${e.endpoint}: HTTP ${e.httpStatus ?? 'network error'} — ${e.message}`) ?? [],
      signalSource:      sosoData?.source ?? 'unavailable',
      providerHealth:    sosoData?.providerHealth ?? 'unavailable',
      cacheAgeSeconds:   sosoData?.cacheAgeSeconds ?? null,
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
      available:         sodexData?.available ?? false,
      error:             sodexData?.error ?? null,
    },
    sodexSigned: {
      accountId:              process.env.SODEX_ACCOUNT_ID ?? null,
      accountAddress:         process.env.SODEX_ACCOUNT_ADDRESS ?? null,
      credentialsPresent:     Boolean(process.env.SODEX_API_PRIVATE_KEY && process.env.SODEX_API_KEY),
      accountInitialized:     Boolean(process.env.SODEX_ACCOUNT_ID && Number(process.env.SODEX_ACCOUNT_ID) > 0),
    },
    database: {
      status:             process.env.DATABASE_URL ? 'configured' : 'not_configured',
      connected:          Boolean(process.env.DATABASE_URL),
    },
    checkedAt: new Date().toISOString(),
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export const dynamic = 'force-dynamic';
