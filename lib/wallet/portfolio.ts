import { createPublicClient, http, formatUnits, erc20Abi } from 'viem';
import { sepolia } from 'viem/chains';
import type { PortfolioAsset, AssetClass } from '@/types/portfolio';

// Common testnet tokens on Sepolia
const TOKENS: Array<{
  symbol: string;
  name: string;
  address: `0x${string}`;
  decimals: number;
  class: AssetClass;
  mockPriceUsd: number;
  delta: number;
}> = [
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    decimals: 6,
    class: 'stablecoin',
    mockPriceUsd: 1.0,
    delta: 0
  },
  {
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    address: '0x29f2D40B0605204364af54EC677bD022dA425d03',
    decimals: 8,
    class: 'spot',
    mockPriceUsd: 63400.0,
    delta: 1.0
  }
];

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http('https://rpc.sepolia.org'),
});

export async function getOnChainPortfolio(address: string): Promise<PortfolioAsset[]> {
  const assets: PortfolioAsset[] = [];
  let totalValueUsd = 0;

  try {
    // 1. Fetch native ETH
    const ethBalance = await publicClient.getBalance({ address: address as `0x${string}` });
    const ethAmount = Number(formatUnits(ethBalance, 18));
    const ethPriceUsd = 3100.0; // Testnet display price only
    const ethValueUsd = ethAmount * ethPriceUsd;

    if (ethAmount > 0) {
      assets.push({
        id: 'native-eth',
        symbol: 'ETH',
        name: 'Ethereum',
        amount: ethAmount,
        priceUsd: ethPriceUsd,
        valueUsd: ethValueUsd,
        class: 'spot',
        delta: 1.0,
        volatility30d: 0,
        riskContribution: 0,
        allocation: 0
      });
      totalValueUsd += ethValueUsd;
    }

    // 2. Fetch ERC20s in parallel
    const tokenBalances = await Promise.all(
      TOKENS.map(async (token) => {
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
      if (amount > 0) {
        const valueUsd = amount * token.mockPriceUsd;
        assets.push({
          id: `erc20-${token.symbol.toLowerCase()}`,
          symbol: token.symbol,
          name: token.name,
          amount,
          priceUsd: token.mockPriceUsd,
          valueUsd,
          class: token.class,
          delta: token.delta,
          volatility30d: 0,
          riskContribution: 0,
          allocation: 0
        });
        totalValueUsd += valueUsd;
      }
    }

    // Calculate allocations
    if (totalValueUsd > 0) {
      for (const asset of assets) {
        asset.allocation = (asset.valueUsd / totalValueUsd) * 100;
      }
    }

    return assets;
  } catch (err) {
    console.error('[DeltaGuard] Error fetching on-chain portfolio:', err);
    throw new Error('Failed to read on-chain balances via public RPC.');
  }
}
