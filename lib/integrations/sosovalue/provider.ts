/**
 * DeltaGuard AI - SoSoValue Shared Provider
 * 
 * AUDIT FINDINGS:
 * - The original `/api/terminal/health` check performed a standalone fetch with a low timeout, which was prone to transient failures, leading to "Offline" status bar readings.
 * - Concurrently, `/terminal/signals` was fetching and normalizing signals, but if the SoSoValue API calls failed due to lack of credentials or actual network issues, the normalizer fell back to hardcoded baselines while continuing to claim they were a "SoSoValue Live Feed".
 * - To resolve this contradiction, this provider implements a shared singleton fetcher that caches the last response for 30 seconds.
 * - Both `/api/terminal/health` and `/api/terminal/signals` query this provider, guaranteeing absolute status alignment.
 */

import type { SignalSource, ProviderHealth, ProviderError } from '@/lib/types/signal-source';

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  release_time: number;
  tags?: string[];
  matched_currencies?: Array<{ id: string; name: string; full_name: string }>;
  [key: string]: unknown;
}

export interface IndexSnapshot {
  '24h_change_pct'?: number;
  [key: string]: unknown;
}

export interface BtcSnapshot {
  change_pct_24h?: number;
  [key: string]: unknown;
}

export interface SoSoValueFetchResult {
  available: boolean;
  source: SignalSource;
  providerHealth: ProviderHealth;
  newsList: NewsItem[];
  indexSnapshot: IndexSnapshot;
  btcSnapshot: BtcSnapshot;
  errors: ProviderError[];
  lastUpdated: string;
  cacheAgeSeconds?: number;
  fetchLatencyMs?: number;
  responseSizeBytes?: number;
}

// If the configured URL ends at the bare domain (no /openapi/v1 path), append it automatically.
function normalizeSoSoBaseUrl(raw: string): string {
  const trimmed = raw.replace(/\/$/, '');
  // If it already has /openapi (or any path deeper than root), use as-is
  if (new URL(trimmed).pathname.length > 1) return trimmed;
  return `${trimmed}/openapi/v1`;
}
const _RAW_SOSOVALUE_URL = process.env.SOSOVALUE_BASE_URL || 'https://openapi.sosovalue.com/openapi/v1';
const BASE_URL = (() => { try { return normalizeSoSoBaseUrl(_RAW_SOSOVALUE_URL); } catch { return _RAW_SOSOVALUE_URL; } })();
const API_KEY = process.env.SOSOVALUE_API_KEY ?? '';

let lastResult: SoSoValueFetchResult | null = null;
let lastFetchAt: number = 0;
const CACHE_TTL_MS = 30_000;

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 2, initialDelay = 800): Promise<Response> {
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
        }
        await new Promise((resolve) => setTimeout(resolve, retryAfter));
        delay *= 2;
        continue;
      }
      return res;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
  return fetch(url, options);
}

export async function getSoSoValueData(): Promise<SoSoValueFetchResult> {
  const now = Date.now();
  if (lastResult && (now - lastFetchAt) < CACHE_TTL_MS) {
    return {
      ...lastResult,
      source: "cached",
      cacheAgeSeconds: (now - lastFetchAt) / 1000
    };
  }

  const result = await fetchFromSoSoValue();
  lastResult = result;
  lastFetchAt = now;
  return result;
}

async function fetchFromSoSoValue(): Promise<SoSoValueFetchResult> {
  const errors: ProviderError[] = [];
  
  if (!process.env.SOSOVALUE_API_KEY || !process.env.SOSOVALUE_BASE_URL) {
    return {
      available: false,
      source: "unavailable",
      providerHealth: "setup_required",
      newsList: [],
      indexSnapshot: {},
      btcSnapshot: {},
      errors: [{
        provider: "SoSoValue",
        endpoint: "credentials",
        httpStatus: null,
        message: "SoSoValue API key or base URL is not configured in the environment."
      }],
      lastUpdated: new Date().toISOString(),
      fetchLatencyMs: 0,
      responseSizeBytes: 0
    };
  }

  let newsList: NewsItem[] = [];
  let indexSnapshot: IndexSnapshot = {};
  let btcSnapshot: BtcSnapshot = {};
  
  let totalBytes = 0;
  const startMs = Date.now();

  let newsSuccess = false;
  let indexSuccess = false;
  let btcSuccess = false;

  // 1. Fetch news
  const newsEndpoint = BASE_URL.endsWith('/') ? `${BASE_URL}news` : `${BASE_URL}/news`;
  try {
    const res = await fetchWithRetry(`${newsEndpoint}?page_size=20`, {
      headers: { 'x-soso-api-key': API_KEY }
    });
    if (res.ok) {
      const text = await res.text();
      totalBytes += text.length;
      const data = JSON.parse(text);
      newsList = data?.list || [];
      newsSuccess = true;
    } else {
      errors.push({
        provider: "SoSoValue",
        endpoint: "/news",
        httpStatus: res.status,
        message: `HTTP error status ${res.status}`
      });
    }
  } catch (err) {
    errors.push({
      provider: "SoSoValue",
      endpoint: "/news",
      httpStatus: null,
      message: err instanceof Error ? err.message : String(err)
    });
  }

  // 2. Fetch Index Snapshot
  const indexEndpoint = BASE_URL.endsWith('/') ? `${BASE_URL}indices/ssimag7/market-snapshot` : `${BASE_URL}/indices/ssimag7/market-snapshot`;
  try {
    const res = await fetchWithRetry(indexEndpoint, {
      headers: { 'x-soso-api-key': API_KEY }
    });
    if (res.ok) {
      const text = await res.text();
      totalBytes += text.length;
      indexSnapshot = JSON.parse(text);
      indexSuccess = true;
    } else {
      errors.push({
        provider: "SoSoValue",
        endpoint: "/indices/ssimag7/market-snapshot",
        httpStatus: res.status,
        message: `HTTP error status ${res.status}`
      });
    }
  } catch (err) {
    errors.push({
      provider: "SoSoValue",
      endpoint: "/indices/ssimag7/market-snapshot",
      httpStatus: null,
      message: err instanceof Error ? err.message : String(err)
    });
  }

  // 3. Fetch BTC Snapshot
  const btcEndpoint = BASE_URL.endsWith('/') ? `${BASE_URL}currencies/1673723677362319866/market-snapshot` : `${BASE_URL}/currencies/1673723677362319866/market-snapshot`;
  try {
    const res = await fetchWithRetry(btcEndpoint, {
      headers: { 'x-soso-api-key': API_KEY }
    });
    if (res.ok) {
      const text = await res.text();
      totalBytes += text.length;
      btcSnapshot = JSON.parse(text);
      btcSuccess = true;
    } else {
      errors.push({
        provider: "SoSoValue",
        endpoint: "/currencies/1673723677362319866/market-snapshot",
        httpStatus: res.status,
        message: `HTTP error status ${res.status}`
      });
    }
  } catch (err) {
    errors.push({
      provider: "SoSoValue",
      endpoint: "/currencies/1673723677362319866/market-snapshot",
      httpStatus: null,
      message: err instanceof Error ? err.message : String(err)
    });
  }

  const allSucceeded = newsSuccess && indexSuccess && btcSuccess;
  const anySucceeded = newsSuccess || indexSuccess || btcSuccess;

  let source: SignalSource = "unavailable";
  let providerHealth: ProviderHealth = "unavailable";

  if (allSucceeded) {
    source = "live";
    providerHealth = "connected";
  } else if (anySucceeded) {
    source = "partial";
    providerHealth = "degraded";
  }

  return {
    available: anySucceeded,
    source,
    providerHealth,
    newsList,
    indexSnapshot,
    btcSnapshot,
    errors,
    lastUpdated: new Date().toISOString(),
    fetchLatencyMs: Date.now() - startMs,
    responseSizeBytes: totalBytes
  };
}
