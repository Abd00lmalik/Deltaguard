/**
 * DeltaGuard AI — Deribit Public Market Intelligence Client
 * Fetches real implied volatility (DVOL) and options skew from Deribit's
 * public REST API — no API key required.
 * 
 * Endpoints used:
 *   /api/v2/public/get_volatility_index_data  → BTC/ETH DVOL implied vol index
 *   /api/v2/public/get_order_book             → Options mid-price for skew proxy
 */

const DERIBIT_BASE = 'https://www.deribit.com/api/v2';
const CACHE_TTL_MS = 5 * 60_000; // 5 minutes

interface DeribitVixEntry {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface DeribitVolatilityData {
  symbol: string;
  dvolIndex: number;      // Current BTC/ETH DVOL index value
  dvolChange24h: number;  // 24h change in DVOL points
  impliedVolatility: number; // annualized IV %
}

export interface DeribitSkewData {
  symbol: string;
  putCallSkew: number;    // Positive = put-heavy (bearish), Negative = call-heavy (bullish)
  skewLabel: string;
}

export interface DeribitIntelligence {
  btcVol: DeribitVolatilityData | null;
  ethVol: DeribitVolatilityData | null;
  btcSkew: DeribitSkewData | null;
  ethSkew: DeribitSkewData | null;
  fetchedAt: string;
  source: 'live' | 'unavailable';
}

let cache: { data: DeribitIntelligence; fetchedAt: number } | null = null;

async function fetchDVOL(currency: 'BTC' | 'ETH'): Promise<DeribitVolatilityData | null> {
  try {
    const endTime = Date.now();
    const startTime = endTime - 48 * 3600 * 1000; // last 48h
    const url = `${DERIBIT_BASE}/public/get_volatility_index_data?currency=${currency}&start_timestamp=${startTime}&end_timestamp=${endTime}&resolution=3600`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = await res.json() as { result?: { data: DeribitVixEntry[] } };
    const data = json.result?.data;
    if (!data || data.length < 2) return null;

    const current = data[data.length - 1].close;
    const yesterday = data[Math.max(0, data.length - 25)].close;
    const change24h = current - yesterday;

    return {
      symbol: currency,
      dvolIndex: Number(current.toFixed(2)),
      dvolChange24h: Number(change24h.toFixed(2)),
      impliedVolatility: Number((current).toFixed(2)), // DVOL is already annualized IV %
    };
  } catch (err) {
    console.warn(`[DeltaGuard] Deribit DVOL fetch failed for ${currency}:`, err);
    return null;
  }
}

async function fetchOptionsSkew(currency: 'BTC' | 'ETH'): Promise<DeribitSkewData | null> {
  try {
    // Get list of instruments to find near-term ATM options
    const instrUrl = `${DERIBIT_BASE}/public/get_instruments?currency=${currency}&kind=option&expired=false`;
    const instrRes = await fetch(instrUrl, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!instrRes.ok) return null;
    const instrJson = await instrRes.json() as {
      result?: Array<{ instrument_name: string; expiration_timestamp: number; option_type: string; strike: number }>
    };
    const instruments = instrJson.result ?? [];

    // Find the nearest expiry (at least 7 days out)
    const minExpiry = Date.now() + 7 * 24 * 3600 * 1000;
    const nearExpiry = instruments
      .filter(i => i.expiration_timestamp >= minExpiry)
      .sort((a, b) => a.expiration_timestamp - b.expiration_timestamp)[0]?.expiration_timestamp;

    if (!nearExpiry) return null;

    const expiryOptions = instruments.filter(i => i.expiration_timestamp === nearExpiry);

    // Get underlying price for ATM detection
    const indexUrl = `${DERIBIT_BASE}/public/get_index_price?index_name=${currency.toLowerCase()}_usd`;
    const indexRes = await fetch(indexUrl, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(4000) });
    const indexJson = await indexRes.json() as { result?: { index_price: number } };
    const underlyingPrice = indexJson.result?.index_price ?? 0;
    if (!underlyingPrice) return null;

    // Find nearest strikes for put and call (25% OTM from ATM proxy)
    const atmStrike = expiryOptions.reduce((prev, curr) =>
      Math.abs(curr.strike - underlyingPrice) < Math.abs(prev.strike - underlyingPrice) ? curr : prev,
      expiryOptions[0]
    )?.strike ?? underlyingPrice;

    // Simple 25-delta proxy: put at ~90% of ATM, call at ~110%
    const putTargetStrike = atmStrike * 0.9;
    const callTargetStrike = atmStrike * 1.1;

    const putInstr = expiryOptions
      .filter(i => i.option_type === 'put')
      .reduce((prev, curr) =>
        Math.abs(curr.strike - putTargetStrike) < Math.abs(prev.strike - putTargetStrike) ? curr : prev,
        expiryOptions.find(i => i.option_type === 'put') ?? expiryOptions[0]
      );
    const callInstr = expiryOptions
      .filter(i => i.option_type === 'call')
      .reduce((prev, curr) =>
        Math.abs(curr.strike - callTargetStrike) < Math.abs(prev.strike - callTargetStrike) ? curr : prev,
        expiryOptions.find(i => i.option_type === 'call') ?? expiryOptions[0]
      );

    if (!putInstr || !callInstr) return null;

    // Fetch order books
    const [putBook, callBook] = await Promise.all([
      fetch(`${DERIBIT_BASE}/public/get_order_book?instrument_name=${putInstr.instrument_name}&depth=1`, { signal: AbortSignal.timeout(4000) }).then(r => r.json()),
      fetch(`${DERIBIT_BASE}/public/get_order_book?instrument_name=${callInstr.instrument_name}&depth=1`, { signal: AbortSignal.timeout(4000) }).then(r => r.json()),
    ]) as [{ result?: { mark_iv: number } }, { result?: { mark_iv: number } }];

    const putIV = putBook.result?.mark_iv ?? 0;
    const callIV = callBook.result?.mark_iv ?? 0;
    if (!putIV || !callIV) return null;

    // Positive skew = puts more expensive = bearish demand
    const putCallSkew = Number((putIV - callIV).toFixed(2));
    const skewLabel = putCallSkew > 5
      ? 'Bearish (Put Skew)'
      : putCallSkew < -5
      ? 'Bullish (Call Skew)'
      : 'Neutral';

    return { symbol: currency, putCallSkew, skewLabel };
  } catch (err) {
    console.warn(`[DeltaGuard] Deribit skew fetch failed for ${currency}:`, err);
    return null;
  }
}

export async function fetchDeribitIntelligence(): Promise<DeribitIntelligence> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data;
  }

  const [btcVol, ethVol, btcSkew, ethSkew] = await Promise.all([
    fetchDVOL('BTC'),
    fetchDVOL('ETH'),
    fetchOptionsSkew('BTC'),
    fetchOptionsSkew('ETH'),
  ]);

  const result: DeribitIntelligence = {
    btcVol,
    ethVol,
    btcSkew,
    ethSkew,
    fetchedAt: new Date().toISOString(),
    source: (btcVol || ethVol) ? 'live' : 'unavailable',
  };

  if (result.source === 'live') {
    cache = { data: result, fetchedAt: now };
  }

  return result;
}
