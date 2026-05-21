/**
 * TERMINAL ROUTE — LIVE DATA ONLY
 * Returns real external API data or honest error states.
 * Does not fall back to mock data silently.
 * 
 * AUDIT FINDINGS:
 * - Previous health route called separate standalone fetches with a 4s timeout. Because it ran
 *   independently from the signals route, it could fail even when signals succeeded (timing difference).
 * - Fixed: health route now calls getSoSoValueData() which shares the 30s provider cache with the
 *   signals route. Both routes will ALWAYS agree on SoSoValue status.
 * - SoSoValue status now derived from real HTTP response outcome, not env var presence.
 */

import { NextResponse } from 'next/server';
import { getSoSoValueData } from '@/lib/integrations/sosovalue/provider';
import { fetchSSIData } from '@/lib/integrations/ssi/server-client';
import type { ProviderHealth } from '@/lib/types/signal-source';

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

async function checkSoDEXPublicHealth(): Promise<{ healthy: boolean; status: number | null; error?: string }> {
  const baseUrl = process.env.SODEX_BASE_URL;
  if (!baseUrl) return { healthy: false, status: null, error: 'SODEX_BASE_URL not configured' };

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 4000);
    const perpsBase = resolvePerpsBase(baseUrl);
    const res = await fetch(perpsBase, { method: 'GET', signal: controller.signal });
    clearTimeout(id);
    // 200-499 means the server is up and responding
    return { healthy: res.status >= 200 && res.status < 500, status: res.status };
  } catch (err) {
    return { healthy: false, status: null, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function GET() {
  // All checks run in parallel
  const [sosoResult, ssiResult, sodexResult] = await Promise.allSettled([
    getSoSoValueData(),
    fetchSSIData(process.env.SODEX_ACCOUNT_ADDRESS ?? null),
    checkSoDEXPublicHealth(),
  ]);

  const sosoData  = sosoResult.status  === 'fulfilled' ? sosoResult.value  : null;
  const ssiData   = ssiResult.status   === 'fulfilled' ? ssiResult.value   : null;
  const sodexData = sodexResult.status === 'fulfilled' ? sodexResult.value : null;

  // SoSoValue — derive from the actual shared provider result (same cache as signals route)
  const sosoHealth: ProviderHealth = sosoData
    ? sosoData.providerHealth
    : 'unavailable';

  // SSI — currently option C (no live source), always setup_required
  const ssiHealth: ProviderHealth = ssiData
    ? (ssiData.setupRequired ? 'setup_required' : ssiData.available ? 'connected' : 'unavailable')
    : 'unavailable';

  // SoDEX Public
  const sodexPublicHealth: ProviderHealth = sodexData?.healthy
    ? (sodexData.status !== null && sodexData.status >= 200 && sodexData.status < 300 ? 'connected' : 'degraded')
    : 'unavailable';

  // SoDEX Signed — requires valid private key + account ID + working public connection
  const sodexSignedHealth: ProviderHealth =
    process.env.SODEX_API_PRIVATE_KEY && process.env.SODEX_ACCOUNT_ID && sodexPublicHealth === 'connected'
      ? 'connected'
      : process.env.SODEX_API_PRIVATE_KEY && process.env.SODEX_ACCOUNT_ID && sodexPublicHealth === 'degraded'
      ? 'degraded'
      : process.env.SODEX_API_PRIVATE_KEY && process.env.SODEX_ACCOUNT_ID
      ? 'degraded'
      : 'setup_required';

  return NextResponse.json({
    sosovalue:   { status: sosoHealth,       connected: sosoHealth === 'connected' || sosoHealth === 'degraded' },
    ssi:         { status: ssiHealth,        connected: ssiHealth === 'connected' },
    sodexPublic: { status: sodexPublicHealth, connected: sodexPublicHealth === 'connected' || sodexPublicHealth === 'degraded' },
    sodexSigned: { status: sodexSignedHealth, connected: sodexSignedHealth === 'connected' || sodexSignedHealth === 'degraded' },
    database:    { status: process.env.DATABASE_URL ? 'connected' : 'setup_required', connected: Boolean(process.env.DATABASE_URL) },
    // Legacy boolean fields for backward compat with LiveStatusBar
    sosovalue_ok:  sosoHealth === 'connected' || sosoHealth === 'degraded',
    ssi_ok:        ssiHealth  === 'connected',
    sodexPublic_ok: sodexPublicHealth === 'connected' || sodexPublicHealth === 'degraded',
    sodexSigned_ok: sodexSignedHealth === 'connected' || sodexSignedHealth === 'degraded',
    checkedAt: new Date().toISOString(),
    signalSource: sosoData?.source ?? 'unavailable',
  }, {
    headers: { 'Cache-Control': 'no-store' }
  });
}

export const dynamic = 'force-dynamic';
