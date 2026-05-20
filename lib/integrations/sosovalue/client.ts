// DeltaGuard AI - SoSoValue Integration Client
// Wave 1: Returns mock data. Wave 2: Replace with real API calls.

import type { CompositeScore, MarketSignal, SignalCategory, SignalSeverity } from '@/types/signals';
import { getMockCompositeScore, getMockSignals } from './mock-client';

const BASE_URL = process.env.SOSOVALUE_BASE_URL || 'https://openapi.sosovalue.com/openapi/v1';
const API_KEY = process.env.SOSOVALUE_API_KEY ?? '';
const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';

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

interface RawSignal {
  id?: string;
  category?: string;
  label?: string;
  score?: number;
  severity?: string;
  confidence?: number;
  timestamp?: string;
  generatedAt?: string;
  explanation?: string;
  source?: string;
}

interface SoSoValueSignalResponse {
  signals?: RawSignal[];
  generatedAt?: string;
}

interface SoSoValueCompositeScoreResponse {
  value?: number;
  score?: number;
  label?: string;
  regime?: string;
  lastUpdated?: string;
}

function mapToMarketSignal(raw: RawSignal): MarketSignal {
  const categories: SignalCategory[] = [
    'etf-flow-pressure',
    'macro-treasury-pressure',
    'btc-volatility',
    'stablecoin-liquidity',
    'market-sentiment',
    'funding-rate-pressure',
    'onchain-risk',
    'ssi-momentum',
    'news-regime-alert'
  ];

  let category: SignalCategory = 'market-sentiment';
  if (raw.category && categories.includes(raw.category as SignalCategory)) {
    category = raw.category as SignalCategory;
  }

  let score = typeof raw.score === 'number' ? raw.score : 0;
  if (score < -100) score = -100;
  if (score > 100) score = 100;

  let severity: SignalSeverity = 'medium';
  const severities: SignalSeverity[] = ['critical', 'high', 'medium', 'low', 'positive'];
  if (raw.severity && severities.includes(raw.severity.toLowerCase() as SignalSeverity)) {
    severity = raw.severity.toLowerCase() as SignalSeverity;
  } else {
    if (score <= -75) severity = 'critical';
    else if (score <= -50) severity = 'high';
    else if (score >= 20) severity = 'positive';
    else if (score < 0) severity = 'medium';
    else severity = 'low';
  }

  return {
    id: raw.id || `sig-${Math.random().toString(36).substring(2, 9)}`,
    category,
    label: raw.label || 'Market Signal',
    score,
    severity,
    confidence: typeof raw.confidence === 'number' ? raw.confidence : 80,
    timestamp: raw.timestamp || raw.generatedAt || new Date().toISOString(),
    explanation: raw.explanation || 'No explanation provided by SoSoValue.',
    source: raw.source || 'SoSoValue OpenAPI'
  };
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
  if (DEMO || !BASE_URL || !API_KEY) return getMockSignals();
  const endpoint = BASE_URL.endsWith('/') ? `${BASE_URL}signals` : `${BASE_URL}/signals`;
  const res = await fetchWithRetry(endpoint, {
    headers: { 'x-soso-api-key': API_KEY }
  });
  if (!res.ok) throw new Error(`SoSoValue API error: ${res.status}`);
  const data = (await res.json()) as SoSoValueSignalResponse;
  const rawSignals = Array.isArray(data?.signals) ? data.signals : [];
  return rawSignals.map(mapToMarketSignal);
}

export async function fetchCompositeScore(): Promise<CompositeScore> {
  if (DEMO || !BASE_URL || !API_KEY) return getMockCompositeScore();
  const endpoint = BASE_URL.endsWith('/') ? `${BASE_URL}composite-score` : `${BASE_URL}/composite-score`;
  const res = await fetchWithRetry(endpoint, {
    headers: { 'x-soso-api-key': API_KEY }
  });
  
  if (!res.ok) {
    // Fallback: calculate composite score from signals
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
    } catch {
      throw new Error(`SoSoValue API error: ${res.status}`);
    }
  }
  const raw = (await res.json()) as SoSoValueCompositeScoreResponse;
  const value = raw.value ?? raw.score ?? 0;
  let regime: 'risk-off' | 'caution' | 'neutral' | 'risk-on' = 'neutral';
  if (raw.regime === 'risk-off' || raw.regime === 'caution' || raw.regime === 'neutral' || raw.regime === 'risk-on') {
    regime = raw.regime;
  } else {
    if (value < -50) regime = 'risk-off';
    else if (value <= 20) regime = 'caution';
    else regime = 'risk-on';
  }
  return {
    value,
    label: raw.label ?? regime.toUpperCase(),
    regime,
    lastUpdated: raw.lastUpdated ?? new Date().toISOString()
  };
}
