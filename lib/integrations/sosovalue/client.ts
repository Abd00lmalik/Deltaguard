// DeltaGuard AI - SoSoValue Integration Client
// Wave 1: Returns mock data. Wave 2: Replace with real API calls.
//
// TODO: Set SOSOVALUE_BASE_URL in .env
// TODO: Set SOSOVALUE_API_KEY in .env
// TODO: Map real SoSoValue response schema to internal MarketSignal type
// TODO: Add rate limit handling after SoSoValue API limits are confirmed
// TODO: Add exponential backoff on 429/503
// TODO: Add signal score normalization to internal -100 to +100 range

import type { CompositeScore, MarketSignal } from '@/types/signals';
import { getMockCompositeScore, getMockSignals } from './mock-client';

const BASE_URL = process.env.SOSOVALUE_BASE_URL ?? '';
const API_KEY = process.env.SOSOVALUE_API_KEY ?? '';
const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';

export async function fetchMarketSignals(): Promise<MarketSignal[]> {
  if (DEMO || !BASE_URL || !API_KEY) return getMockSignals();
  const res = await fetch(`${BASE_URL}/signals`, {
    headers: { Authorization: `Bearer ${API_KEY}` }
  });
  if (!res.ok) throw new Error(`SoSoValue API error: ${res.status}`);
  const data = (await res.json()) as unknown;
  return data as MarketSignal[];
}

export async function fetchCompositeScore(): Promise<CompositeScore> {
  if (DEMO || !BASE_URL || !API_KEY) return getMockCompositeScore();
  throw new Error('SoSoValue composite score endpoint not yet mapped.');
}
