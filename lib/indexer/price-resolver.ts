/*
AUDIT RESULTS:
1. Hardcoded pricing:
lib/mock/portfolio.ts:75:    priceUsd: 1.0,

2. Mock reasoning:
app/api/terminal/agent/scan/route.ts:4: * Does not fall back to mock data silently.
app/api/terminal/agent/scan/route.ts:5: * If all sources fail, returns structured error — never mock values.
lib/agent/decision-engine.ts:64:            'BTC/USDT Perp is selected as the highest beta-weight hedge vehicle for the mock portfolio.'
lib/agent/decision-engine.ts:86:      'Slippage estimate: 0.08% based on simulated SoDEX depth.',
lib/agent/decision-engine.ts:95:      'Simulated execution may differ from real market conditions.',
lib/agent/reasoning-engine.ts:6:      `The composite signal score of ${output.compositeScore} places the market in a risk-off regime. Multiple mock SoSoValue-style inputs are pointing in the same direction: ETF outflows, macro pressure, volatility expansion, and weakening SSI momentum.`,
lib/agent/reasoning-engine.ts:8:      `The recommendation requires user approval before any simulated execution can occur. DeltaGuard AI never auto-executes, never touches real funds, and never presents mock execution as live trading.`
lib/agent/reasoning-engine.ts:16:      'No simulated order is created unless the hedge threshold and portfolio delta rules are both satisfied.'

3. Architecture route:
app/integrations/page.tsx:47:      <Topbar title="System Architecture" />
app/integrations/page.tsx:51:          <h1 className="mt-3 font-sora text-2xl font-bold text-white">System Architecture</h1>
components/layout/Sidebar.tsx:52:    { label: 'Architecture', href: '/integrations', icon: Layers },

4. Signal pipeline gaps:
lib/integrations/sosovalue/normalizer.ts:174:  // Options Skew signal from Deribit (new signal)
lib/integrations/sosovalue/normalizer.ts:177:  let optionsSkewSource: SignalSource = 'unavailable';
lib/integrations/sosovalue/normalizer.ts:180:    // Positive skew = puts more expensive = bearish demand = negative signal
lib/integrations/sosovalue/normalizer.ts:189:  // Orderbook Imbalance signal from Hyperliquid (new signal)
lib/integrations/sosovalue/normalizer.ts:192:  let obImbalanceSource: SignalSource = 'unavailable';
lib/integrations/sosovalue/normalizer.ts:195:    // Positive ratio = buy-side dominant = bullish = positive signal

5. Chart data binding:
app/api/terminal/portfolio/history/route.ts:2:import { getPortfolioSnapshots, type PortfolioSnapshot } from '@/lib/storage/portfolio-history';
app/api/terminal/portfolio/history/route.ts:4:import { getHistoricalPrices, getCoinGeckoId } from '@/lib/providers/price-feed';
app/api/terminal/portfolio/history/route.ts:20:  // If we have fewer than 7 snapshots, let's reconstruct the historical 7-day trend to avoid a blank or tiny chart!
components/dashboard/PortfolioOverview.tsx:6:  AreaChart,
components/dashboard/PortfolioOverview.tsx:12:} from 'recharts';
components/dashboard/PortfolioOverview.tsx:15:import type { PortfolioSnapshot } from '@/lib/storage/portfolio-history';
components/dashboard/PortfolioOverview.tsx:32:  const [chartData, setChartData] = useState<ChartPoint[]>([]);
*/

import { fetchLivePrices } from '@/lib/providers/price-feed';

export type PriceResolutionResult = {
  contractAddress: string;
  chainId: number;
  priceUsd: number | null;     // null = price unavailable, never 1 as default
  source: "alchemy" | "covalent" | "moralis" | "coingecko_fallback" | "binance" | "unavailable";
};

// Hardcode only the most common symbols for CoinGecko ID mapping
const COINGECKO_ID_MAP: Record<string, string> = {
  ETH:   "ethereum",
  WETH:  "weth",
  BTC:   "bitcoin",
  WBTC:  "wrapped-bitcoin",
  USDC:  "usd-coin",
  USDT:  "tether",
  DAI:   "dai",
  STETH: "staked-ether",
  LINK:  "chainlink",
  UNI:   "uniswap",
  AAVE:  "aave",
  OP:    "optimism",
  ARB:   "arbitrum",
  MATIC: "matic-network",
};

async function fetchAlchemyPrice(contractAddress: string, chainId: number): Promise<number | null> {
  try {
    const networkMap: Record<number, string> = {
      1: "eth-mainnet",
      8453: "base-mainnet",
      10: "opt-mainnet",
      11155111: "eth-sepolia",
    };
    const network = networkMap[chainId];
    if (!network) return null;

    const apiKey = process.env.ALCHEMY_API_KEY;
    if (!apiKey) return null;

    const url = `https://api.g.alchemy.com/prices/v1/${apiKey}/tokens/by-address`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        addresses: [
          {
            network,
            address: contractAddress.toLowerCase(),
          }
        ]
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;
    const json = await res.json() as {
      data?: {
        network: string;
        address: string;
        prices?: { currency: string; value: string; lastUpdatedAt: string }[];
        error?: string;
      }[];
    };

    const tokenPrice = json.data?.[0]?.prices?.[0]?.value;
    if (!tokenPrice) return null;
    const parsed = parseFloat(tokenPrice);
    return isNaN(parsed) || parsed <= 0 ? null : parsed;
  } catch (err) {
    console.error("[PriceResolver] Alchemy fetch failed:", err);
    return null;
  }
}

async function fetchCovalentPrice(contractAddress: string, chainId: number): Promise<number | null> {
  try {
    const apiKey = process.env.COVALENT_API_KEY;
    if (!apiKey) return null;

    const url = `https://api.covalenthq.com/v1/pricing/historical_by_addresses_v2/${chainId}/USD/${contractAddress}/`;
    const res = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;
    const json = await res.json() as {
      data?: {
        prices?: { price: number | null }[];
      }[];
    };

    const price = json.data?.[0]?.prices?.[0]?.price;
    return price ?? null;
  } catch (err) {
    console.error("[PriceResolver] Covalent fetch failed:", err);
    return null;
  }
}

async function fetchCoinGeckoPrice(cgId: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${cgId}&vs_currencies=usd`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return null;
    const data = await res.json() as Record<string, { usd?: number }>;
    return data?.[cgId]?.usd ?? null;
  } catch {
    return null;
  }
}

export async function resolveTokenPrice(
  contractAddress: string,
  chainId: number,
  symbol: string
): Promise<PriceResolutionResult> {
  const base = { contractAddress, chainId };

  // Attempt 1: Alchemy Price API
  if (process.env.ALCHEMY_API_KEY) {
    const price = await fetchAlchemyPrice(contractAddress, chainId);
    if (price !== null) return { ...base, priceUsd: price, source: "alchemy" };
  }

  // Attempt 2: Covalent
  if (process.env.COVALENT_API_KEY) {
    const price = await fetchCovalentPrice(contractAddress, chainId);
    if (price !== null) return { ...base, priceUsd: price, source: "covalent" };
  }

  // Attempt 3: CoinGecko (free tier, no key required for major tokens)
  const cgId = COINGECKO_ID_MAP[symbol.toUpperCase()];
  if (cgId) {
    const price = await fetchCoinGeckoPrice(cgId);
    if (price !== null) return { ...base, priceUsd: price, source: "coingecko_fallback" };
  }

  // Attempt 4: Binance Ticker Fallback
  try {
    const binancePrices = await fetchLivePrices([symbol]);
    const price = binancePrices[symbol.toUpperCase()];
    if (price !== undefined && price !== null && price > 0) {
      return { ...base, priceUsd: price, source: "binance" };
    }
  } catch (err) {
    console.error("[PriceResolver] Binance fallback failed:", err);
  }

  // No price available — return null, never return 1
  return { ...base, priceUsd: null, source: "unavailable" };
}
