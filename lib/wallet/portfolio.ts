import { createPublicClient, http, formatUnits, erc20Abi } from 'viem';
import { sepolia } from 'viem/chains';
import type { PortfolioAsset } from '@/types/portfolio';

// Common testnet tokens on Sepolia
const TOKENS = [
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as const, // Sepolia USDC
    decimals: 6,
    class: 'stablecoin',
    mockPriceUsd: 1.0,
    delta: 0
  },
  {
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    address: '0x29f2D40B0605204364af54EC677bD022dA425d03' as const, // Sepolia WBTC mock
    decimals: 8,
    class: 'crypto',
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
    const ethPriceUsd = 3100.0; // Mock price for testnet display
    const ethValueUsd = ethAmount * ethPriceUsd;
    
    if (ethAmount > 0) {
      assets.push({
        id: 'native-eth',
        symbol: 'ETH',
        name: 'Ethereum',
        amount: ethAmount,
        priceUsd: ethPriceUsd,
        valueUsd: ethValueUsd,
        class: 'crypto',
        delta: 1.0,
        allocation: 0 // Calculated later
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
          allocation: 0 // Calculated later
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
