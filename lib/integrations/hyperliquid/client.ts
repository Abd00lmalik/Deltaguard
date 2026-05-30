/**
 * DeltaGuard AI — Hyperliquid Public Market Intelligence Client
 * Fetches live orderbook depth, funding rates, and open interest
 * from Hyperliquid's public API — no API key required.
 * 
 * Hourly cache for orderbook imbalance data.
 */

const HYPERLIQUID_API = 'https://api.hyperliquid.xyz/info';
const CACHE_TTL_MS = 60_000; // 60 seconds

import { fetchWithRetry } from '@/lib/utils/fetch-with-retry';

export interface HyperliquidFunding {
  coin: string;
  fundingRate: number;   // annualized, e.g. 0.0001
  nextFundingTime: number;
  openInterest: number;  // USD
  premium: number;       // mark - index (basis)
}

export interface HyperliquidOrderbookImbalance {
  coin: string;
  bidDepthUsd: number;
  askDepthUsd: number;
  imbalanceRatio: number;   // (bid - ask) / (bid + ask), [-1, 1]
  imbalanceLabel: string;
}

export interface HyperliquidIntelligence {
  btcFunding: HyperliquidFunding | null;
  ethFunding: HyperliquidFunding | null;
  btcOrderbook: HyperliquidOrderbookImbalance | null;
  ethOrderbook: HyperliquidOrderbookImbalance | null;
  fetchedAt: string;
  source: 'live' | 'unavailable';
}

let cache: { data: HyperliquidIntelligence; fetchedAt: number } | null = null;

type HLMeta = { universe: Array<{ name: string }> };
type HLAssetCtx = {
  funding: string;
  openInterest: string;
  prevDayPx: string;
  dayNtlVlm: string;
  premium: string;
  oraclePx: string;
  markPx: string;
  midPx: string | null;
  impactPxs: [string, string] | null;
};

async function fetchFundingData(): Promise<{ btc: HyperliquidFunding | null; eth: HyperliquidFunding | null }> {
  try {
    const res = await fetchWithRetry(HYPERLIQUID_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'metaAndAssetCtxs' }),
      timeoutMs: 5000,
    });
    if (!res.ok) return { btc: null, eth: null };
    const [meta, assetCtxs] = await res.json() as [HLMeta, HLAssetCtx[]];

    const coins = meta.universe.map((u, i) => ({ name: u.name, ctx: assetCtxs[i] }));
    const btcData = coins.find(c => c.name === 'BTC');
    const ethData = coins.find(c => c.name === 'ETH');

    const toFunding = (d: typeof btcData): HyperliquidFunding | null => {
      if (!d) return null;
      const fundingRate = Number(d.ctx.funding);
      const markPx = Number(d.ctx.markPx);
      const oraclePx = Number(d.ctx.oraclePx);
      return {
        coin: d.name,
        fundingRate,
        nextFundingTime: Date.now() + 8 * 3600 * 1000, // HL settles every 8h
        openInterest: Number(d.ctx.openInterest) * oraclePx,
        premium: markPx - oraclePx,
      };
    };

    return { btc: toFunding(btcData), eth: toFunding(ethData) };
  } catch (err) {
    console.warn('[DeltaGuard] Hyperliquid funding fetch failed:', err);
    return { btc: null, eth: null };
  }
}

type HLL2Level = { px: string; sz: string; n: number };
type HLL2 = {
  levels: [HLL2Level[], HLL2Level[]];
};

async function fetchOrderbookImbalance(coin: string): Promise<HyperliquidOrderbookImbalance | null> {
  try {
    const res = await fetchWithRetry(HYPERLIQUID_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'l2Book', coin, nSigFigs: 5 }),
      timeoutMs: 5000,
    });
    if (!res.ok) return null;
    const book = await res.json() as HLL2;
    const bids = book.levels[0] ?? [];
    const asks = book.levels[1] ?? [];

    // Sum top-10 bid and ask depth in USD
    const bidDepthUsd = bids.slice(0, 10).reduce((sum, lvl) => sum + Number(lvl.px) * Number(lvl.sz), 0);
    const askDepthUsd = asks.slice(0, 10).reduce((sum, lvl) => sum + Number(lvl.px) * Number(lvl.sz), 0);

    const total = bidDepthUsd + askDepthUsd;
    if (total === 0) return null;

    const imbalanceRatio = (bidDepthUsd - askDepthUsd) / total;
    const imbalanceLabel = imbalanceRatio > 0.15
      ? 'Buy-side dominant (bullish pressure)'
      : imbalanceRatio < -0.15
      ? 'Sell-side dominant (bearish pressure)'
      : 'Balanced orderbook';

    return {
      coin,
      bidDepthUsd: Math.round(bidDepthUsd),
      askDepthUsd: Math.round(askDepthUsd),
      imbalanceRatio: Number(imbalanceRatio.toFixed(4)),
      imbalanceLabel,
    };
  } catch (err) {
    console.warn(`[DeltaGuard] Hyperliquid L2 fetch failed for ${coin}:`, err);
    return null;
  }
}

export async function fetchHyperliquidIntelligence(): Promise<HyperliquidIntelligence> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data;
  }

  const [fundingData, btcOrderbook, ethOrderbook] = await Promise.all([
    fetchFundingData(),
    fetchOrderbookImbalance('BTC'),
    fetchOrderbookImbalance('ETH'),
  ]);

  const result: HyperliquidIntelligence = {
    btcFunding: fundingData.btc,
    ethFunding: fundingData.eth,
    btcOrderbook,
    ethOrderbook,
    fetchedAt: new Date().toISOString(),
    source: (fundingData.btc || fundingData.eth) ? 'live' : 'unavailable',
  };

  if (result.source === 'live') {
    cache = { data: result, fetchedAt: now };
  }

  return result;
}
