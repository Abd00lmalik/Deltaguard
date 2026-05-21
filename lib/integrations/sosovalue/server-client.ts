// DeltaGuard AI - SoSoValue Integration Server Client (Live mode only)

import type { CompositeScore, MarketSignal, SignalSeverity } from '@/types/signals';
import { normalizeSoSoValueData } from './normalizer';

const BASE_URL = process.env.SOSOVALUE_BASE_URL || 'https://openapi.sosovalue.com/openapi/v1';
const API_KEY = process.env.SOSOVALUE_API_KEY ?? '';

const SEVERITY_WEIGHTS: Record<SignalSeverity, number> = {
  critical: 1.45,
  high: 1.16,
  medium: 0.82,
  low: 0.55,
  positive: 1
};

export function calculateCompositeScore(signals: MarketSignal[]): number {
  if (signals.length === 0) return 0;
  const weighted = signals.reduce(
    (acc, signal) => {
      const weight = SEVERITY_WEIGHTS[signal.severity] * (signal.confidence / 100);
      return {
        score: acc.score + signal.score * weight,
        weight: acc.weight + weight
      };
    },
    { score: 0, weight: 0 }
  );
  const rawScore = weighted.weight === 0 ? 0 : weighted.score / weighted.weight;
  return Math.round(Math.max(-100, Math.min(100, rawScore * 1.07)));
}

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3, initialDelay = 1000): Promise<Response> {
  let delay = initialDelay;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.status === 429 || res.status === 503) {
        let retryAfter = delay;
        const retryAfterHeader = res.headers.get('retry-after');
        if (retryAfterHeader) {
          const seconds = parseInt(retryAfterHeader, 10);
          if (!isNaN(seconds)) {
            retryAfter = seconds * 1000;
          }
        } else {
          try {
            const parsed = await res.clone().json() as { details?: { retry_after?: number } };
            if (parsed?.details?.retry_after) {
              retryAfter = parsed.details.retry_after * 1000;
            }
          } catch {
            // ignore error clone/parse
          }
        }
        console.warn(`SoSoValue API status ${res.status}. Retrying in ${retryAfter}ms...`);
        await new Promise((resolve) => setTimeout(resolve, retryAfter));
        delay *= 2;
        continue;
      }
      return res;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.warn(`SoSoValue fetch error: ${error}. Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
  return fetch(url, options);
}

export async function fetchMarketSignals(): Promise<MarketSignal[]> {
  if (!BASE_URL || !API_KEY) {
    throw new Error('SoSoValue credentials not configured.');
  }

  let newsList = [];
  let indexSnapshot = {};
  let btcSnapshot = {};

  // 1. Fetch news feed
  try {
    const newsEndpoint = BASE_URL.endsWith('/') ? `${BASE_URL}news` : `${BASE_URL}/news`;
    const res = await fetchWithRetry(`${newsEndpoint}?page_size=20`, {
      headers: { 'x-soso-api-key': API_KEY }
    });
    if (res.ok) {
      const data = await res.json();
      newsList = data?.list || [];
    } else {
      console.warn(`SoSoValue news API returned status ${res.status}`);
    }
  } catch (err) {
    console.error('Failed to fetch news from SoSoValue:', err);
  }

  // 2. Fetch Index snapshot
  try {
    const indexEndpoint = BASE_URL.endsWith('/') ? `${BASE_URL}indices/ssimag7/market-snapshot` : `${BASE_URL}/indices/ssimag7/market-snapshot`;
    const res = await fetchWithRetry(indexEndpoint, {
      headers: { 'x-soso-api-key': API_KEY }
    });
    if (res.ok) {
      indexSnapshot = await res.json();
    } else {
      console.warn(`SoSoValue index snapshot API returned status ${res.status}`);
    }
  } catch (err) {
    console.error('Failed to fetch index snapshot from SoSoValue:', err);
  }

  // 3. Fetch BTC snapshot
  try {
    const btcEndpoint = BASE_URL.endsWith('/') ? `${BASE_URL}currencies/1673723677362319866/market-snapshot` : `${BASE_URL}/currencies/1673723677362319866/market-snapshot`;
    const res = await fetchWithRetry(btcEndpoint, {
      headers: { 'x-soso-api-key': API_KEY }
    });
    if (res.ok) {
      btcSnapshot = await res.json();
    } else {
      console.warn(`SoSoValue BTC snapshot API returned status ${res.status}`);
    }
  } catch (err) {
    console.error('Failed to fetch BTC snapshot from SoSoValue:', err);
  }

  return normalizeSoSoValueData(newsList, indexSnapshot, btcSnapshot);
}

export async function fetchCompositeScore(): Promise<CompositeScore> {
  // Rather than calling nonexistent endpoint `/composite-score`, calculate it from live signals
  try {
    const signals = await fetchMarketSignals();
    const score = calculateCompositeScore(signals);
    let regime: 'risk-off' | 'caution' | 'neutral' | 'risk-on' = 'neutral';
    let label = 'NEUTRAL';
    if (score < -50) {
      regime = 'risk-off';
      label = 'RISK-OFF';
    } else if (score <= 20) {
      regime = 'caution';
      label = 'CAUTION';
    } else {
      regime = 'risk-on';
      label = 'RISK-ON';
    }
    return {
      value: score,
      label,
      regime,
      lastUpdated: new Date().toISOString()
    };
  } catch (err) {
    console.error('Failed to calculate composite score from live signals:', err);
    throw err;
  }
}
