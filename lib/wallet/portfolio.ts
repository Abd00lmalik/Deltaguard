/**
 * DeltaGuard AI — On-Chain Portfolio Resolver
 * Dynamically routes to the correct chain via chainId.
 * If ALCHEMY_API_KEY is set: uses Alchemy Token API for auto-discovery.
 * Otherwise: falls back to per-chain hardcoded token lists.
 */

import { createPublicClient, http, formatUnits, erc20Abi } from 'viem';
import { mainnet, base, optimism, sepolia } from 'viem/chains';
import type { Chain } from 'viem';
import { getTokenPricesUsd } from '@/lib/providers/price-feed';
import { CHAIN_CONFIGS } from '@/lib/web3/chains';
import type { PortfolioAsset, AssetClass } from '@/types/portfolio';

// ─── Static fallback token lists per chain ────────────────────────────────────

interface TokenEntry {
  symbol: string;
  name: string;
  address: `0x${string}`;
  decimals: number;
  class: AssetClass;
  geckoId: string;
  delta: number;
}

const FALLBACK_TOKENS: Record<number, TokenEntry[]> = {
  [sepolia.id]: [
    { symbol: 'USDC', name: 'USD Coin',          address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', decimals: 6,  class: 'stablecoin', geckoId: 'usd-coin',        delta: 0   },
    { symbol: 'WBTC', name: 'Wrapped Bitcoin',    address: '0x29f2D40B0605204364af54EC677bD022dA425d03', decimals: 8,  class: 'spot',       geckoId: 'wrapped-bitcoin', delta: 1.0 },
    { symbol: 'LINK', name: 'Chainlink',          address: '0x779877A7B0D9E8603169DdbD7836e478b4624789', decimals: 18, class: 'spot',       geckoId: 'chainlink',       delta: 0.75},
    { symbol: 'WETH', name: 'Wrapped Ether',      address: '0x7b79995e5f793a07bc00c21412e50ecae098e7f9', decimals: 18, class: 'spot',       geckoId: 'weth',            delta: 1.0 },
    { symbol: 'DAI',  name: 'Dai Stablecoin',     address: '0x3e622317f8C93f732A4141a59b659CE7d4F76964', decimals: 18, class: 'stablecoin', geckoId: 'dai',             delta: 0   },
  ],
  [mainnet.id]: [
    { symbol: 'USDC', name: 'USD Coin',           address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6,  class: 'stablecoin', geckoId: 'usd-coin',        delta: 0   },
    { symbol: 'WBTC', name: 'Wrapped Bitcoin',    address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8,  class: 'spot',       geckoId: 'wrapped-bitcoin', delta: 1.0 },
    { symbol: 'WETH', name: 'Wrapped Ether',      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18, class: 'spot',       geckoId: 'weth',            delta: 1.0 },
    { symbol: 'DAI',  name: 'Dai Stablecoin',     address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18, class: 'stablecoin', geckoId: 'dai',             delta: 0   },
    { symbol: 'LINK', name: 'Chainlink',          address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', decimals: 18, class: 'spot',       geckoId: 'chainlink',       delta: 0.75},
    { symbol: 'UNI',  name: 'Uniswap',            address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', decimals: 18, class: 'spot',       geckoId: 'uniswap',         delta: 0.9 },
    { symbol: 'AAVE', name: 'Aave',               address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', decimals: 18, class: 'spot',       geckoId: 'aave',            delta: 0.85},
    { symbol: 'stETH',name: 'Lido Staked Ether',  address: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84', decimals: 18, class: 'spot',       geckoId: 'staked-ether',    delta: 1.0 },
  ],
  [base.id]: [
    { symbol: 'USDC', name: 'USD Coin',           address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6,  class: 'stablecoin', geckoId: 'usd-coin',        delta: 0   },
    { symbol: 'WETH', name: 'Wrapped Ether',      address: '0x4200000000000000000000000000000000000006', decimals: 18, class: 'spot',       geckoId: 'weth',            delta: 1.0 },
    { symbol: 'DAI',  name: 'Dai Stablecoin',     address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', decimals: 18, class: 'stablecoin', geckoId: 'dai',             delta: 0   },
  ],
  [optimism.id]: [
    { symbol: 'USDC', name: 'USD Coin',           address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6,  class: 'stablecoin', geckoId: 'usd-coin',        delta: 0   },
    { symbol: 'WBTC', name: 'Wrapped Bitcoin',    address: '0x68f180fcCe6836688e9084f035309E29Bf0A2095', decimals: 8,  class: 'spot',       geckoId: 'wrapped-bitcoin', delta: 1.0 },
    { symbol: 'WETH', name: 'Wrapped Ether',      address: '0x4200000000000000000000000000000000000006', decimals: 18, class: 'spot',       geckoId: 'weth',            delta: 1.0 },
    { symbol: 'DAI',  name: 'Dai Stablecoin',     address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', decimals: 18, class: 'stablecoin', geckoId: 'dai',             delta: 0   },
    { symbol: 'OP',   name: 'Optimism',           address: '0x4200000000000000000000000000000000000042', decimals: 18, class: 'spot',       geckoId: 'optimism',        delta: 0.95},
  ],
};

// ─── Chain → viem chain object mapping ───────────────────────────────────────

const CHAIN_OBJECTS: Record<number, Chain> = {
  [mainnet.id]:  mainnet,
  [base.id]:     base,
  [optimism.id]: optimism,
  [sepolia.id]:  sepolia,
};

// ─── Alchemy Token Discovery ──────────────────────────────────────────────────

interface AlchemyTokenBalance {
  contractAddress: string;
  tokenBalance: string | null;
}

interface AlchemyTokenMetadata {
  symbol: string | null;
  name: string | null;
  decimals: number | null;
  logo: string | null;
}

async function getAlchemyTokenBalances(
  address: string,
  chainId: number,
  alchemyKey: string
): Promise<TokenEntry[]> {
  const config = CHAIN_CONFIGS[chainId];
  if (!config) return [];

  const rpcUrl = `https://${config.alchemyNetwork}.g.alchemy.com/v2/${alchemyKey}`;

  // Step 1: Get all ERC-20 balances for this address
  const balRes = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1, method: 'alchemy_getTokenBalances',
      params: [address, 'erc20'],
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!balRes.ok) throw new Error('Alchemy token balances request failed');
  const balJson = await balRes.json() as { result?: { tokenBalances: AlchemyTokenBalance[] } };
  const tokenBalances = balJson.result?.tokenBalances ?? [];

  // Filter to non-zero balances
  const nonZero = tokenBalances.filter(t => t.tokenBalance && t.tokenBalance !== '0x' && BigInt(t.tokenBalance) > 0n);
  if (nonZero.length === 0) return [];

  // Step 2: Fetch metadata for each token in parallel
  const metaResults = await Promise.allSettled(
    nonZero.map(async (t) => {
      const metaRes = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0', id: 1, method: 'alchemy_getTokenMetadata',
          params: [t.contractAddress],
        }),
        signal: AbortSignal.timeout(5000),
      });
      const metaJson = await metaRes.json() as { result?: AlchemyTokenMetadata };
      const meta = metaJson.result;
      return { balance: t, meta };
    })
  );

  // Map to TokenEntry format
  const discovered: TokenEntry[] = [];
  for (const result of metaResults) {
    if (result.status !== 'fulfilled') continue;
    const { balance, meta } = result.value;
    if (!meta?.symbol || !meta?.decimals) continue;

    const symbol = meta.symbol.toUpperCase();
    // Classify by symbol heuristic
    const isStable = ['USDC','USDT','DAI','FRAX','LUSD','BUSD','GUSD','TUSD','USDP'].includes(symbol);
    const class_: AssetClass = isStable ? 'stablecoin' : 'spot';
    const geckoId = symbol.toLowerCase(); // best-effort gecko ID
    const delta = isStable ? 0 : 1.0; // will be refined by beta engine

    discovered.push({
      symbol,
      name: meta.name ?? symbol,
      address: balance.contractAddress as `0x${string}`,
      decimals: meta.decimals,
      class: class_,
      geckoId,
      delta,
    });
  }

  return discovered;
}

// ─── Main Portfolio Resolver ──────────────────────────────────────────────────

export async function getOnChainPortfolio(address: string, chainId?: number): Promise<PortfolioAsset[]> {
  const activeChainId = chainId ?? sepolia.id;
  const chain = CHAIN_OBJECTS[activeChainId] ?? sepolia;
  const config = CHAIN_CONFIGS[activeChainId];

  // Choose RPC: Alchemy if key present, public fallback otherwise
  const alchemyKey = process.env.ALCHEMY_API_KEY ?? '';
  const rpcUrl = config?.rpcUrl && alchemyKey
    ? config.rpcUrl
    : undefined; // undefined → viem uses the chain's default public RPC

  const publicClient = createPublicClient({
    chain,
    transport: rpcUrl ? http(rpcUrl) : http(),
  });

  const assets: PortfolioAsset[] = [];
  let totalValueUsd = 0;

  // Determine token list: Alchemy discovery or static fallback
  let tokenList: TokenEntry[];
  if (alchemyKey && config) {
    try {
      tokenList = await getAlchemyTokenBalances(address, activeChainId, alchemyKey);
    } catch (err) {
      console.warn('[DeltaGuard] Alchemy discovery failed, falling back to static list:', err);
      tokenList = FALLBACK_TOKENS[activeChainId] ?? [];
    }
  } else {
    tokenList = FALLBACK_TOKENS[activeChainId] ?? [];
  }

  // Gather all unique symbols for price fetching
  const allSymbols = ['ETH', ...tokenList.map(t => t.symbol)];
  const livePrices = await getTokenPricesUsd(allSymbols);

  try {
    // 1. Native ETH/chain-native balance
    const nativeBalance = await publicClient.getBalance({ address: address as `0x${string}` });
    const ethAmount = Number(formatUnits(nativeBalance, 18));
    const ethPriceUsd = livePrices['ETH'] ?? 0;
    const ethValueUsd = ethAmount * ethPriceUsd;

    if (ethAmount > 0.000001) {
      assets.push({
        id: 'native-eth',
        symbol: 'ETH',
        name: chain.id === sepolia.id ? 'Ethereum (Sepolia)' : 'Ethereum',
        amount: ethAmount,
        priceUsd: ethPriceUsd,
        valueUsd: ethValueUsd,
        class: 'spot',
        delta: 1.0,
        volatility30d: 70,
        riskContribution: 0,
        allocation: 0,
      });
      totalValueUsd += ethValueUsd;
    }

    // 2. ERC-20 balances (Alchemy-discovered or static)
    // If Alchemy discovery was used, balances are already non-zero;
    // if static list, we still need to check on-chain.
    const tokenBalances = await Promise.all(
      tokenList.map(async (token) => {
        try {
          const balance = await publicClient.readContract({
            address: token.address,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [address as `0x${string}`],
          });
          return { token, balance };
        } catch {
          return { token, balance: 0n };
        }
      })
    );

    for (const { token, balance } of tokenBalances) {
      const amount = Number(formatUnits(balance, token.decimals));
      if (amount > 0.0001) {
        const priceUsd = livePrices[token.symbol] ?? 1;
        const valueUsd = amount * priceUsd;
        assets.push({
          id: `erc20-${token.symbol.toLowerCase()}-${activeChainId}`,
          symbol: token.symbol,
          name: token.name,
          amount,
          priceUsd,
          valueUsd,
          class: token.class,
          delta: token.delta,
          volatility30d: 0,
          riskContribution: 0,
          allocation: 0,
        });
        totalValueUsd += valueUsd;
      }
    }

    // 3. Compute allocations and risk contributions
    if (totalValueUsd > 0) {
      for (const asset of assets) {
        asset.allocation = (asset.valueUsd / totalValueUsd) * 100;
        asset.riskContribution = asset.delta * (asset.valueUsd / totalValueUsd);
      }
    }

    return assets.sort((a, b) => b.valueUsd - a.valueUsd); // Sort by value desc
  } catch (err) {
    console.error('[DeltaGuard] Error fetching on-chain portfolio:', err);
    throw new Error(`Failed to read on-chain balances on chain ${activeChainId} via RPC.`);
  }
}
