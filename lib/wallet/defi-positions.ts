/**
 * DeltaGuard AI — DeFi Position Parser
 * Reads user positions from smart contracts for:
 * - Aave V3 (collateral, debt, health factor)
 * - Lido stETH (staked ether balance)
 * - Uniswap V3 LP (NonfungiblePositionManager)
 */

import { createPublicClient, http, formatUnits } from 'viem';
import { mainnet } from 'viem/chains';
import { CHAIN_CONFIGS } from '../web3/chains';
import { getTokenPricesUsd } from '../providers/price-feed';

export interface DeFiPosition {
  id: string;
  protocol: 'aave' | 'lido' | 'uniswap';
  name: string;
  valueUsd: number;
  details: {
    collateralUsd?: number;
    debtUsd?: number;
    healthFactor?: number;
    ltv?: number;
    amount?: number;
    priceUsd?: number;
    tokenId?: string;
    pairName?: string;
    liquidity?: string;
  };
  chainId: number;
}

// ─── ABIs ────────────────────────────────────────────────────────────────────

const AAVE_POOL_ABI = [
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getUserAccountData',
    outputs: [
      { name: 'totalCollateralBase', type: 'uint256' },
      { name: 'totalDebtBase', type: 'uint256' },
      { name: 'availableBorrowsBase', type: 'uint256' },
      { name: 'currentLiquidationThreshold', type: 'uint256' },
      { name: 'ltv', type: 'uint256' },
      { name: 'healthFactor', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const UNI_V3_MANAGER_ABI = [
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'index', type: 'uint256' },
    ],
    name: 'tokenOfOwnerByIndex',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'positions',
    outputs: [
      { name: 'nonce', type: 'uint96' },
      { name: 'operator', type: 'address' },
      { name: 'token0', type: 'address' },
      { name: 'token1', type: 'address' },
      { name: 'fee', type: '24' },
      { name: 'tickLower', type: 'int24' },
      { name: 'tickUpper', type: 'int24' },
      { name: 'liquidity', type: 'uint128' },
      { name: 'feeGrowthInside0LastX128', type: 'uint256' },
      { name: 'feeGrowthInside1LastX128', type: 'uint256' },
      { name: 'tokensOwed0', type: 'uint128' },
      { name: 'tokensOwed1', type: 'uint128' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// ─── Fetchers ────────────────────────────────────────────────────────────────

async function fetchAavePosition(
  address: string,
  chainId: number
): Promise<DeFiPosition | null> {
  const config = CHAIN_CONFIGS[chainId];
  if (!config?.protocols?.aavePool) return null;

  try {
    const publicClient = createPublicClient({
      chain: config.chain,
      transport: http(config.rpcUrl),
    });

    const [
      totalCollateralBase,
      totalDebtBase,
      ,
      ,
      ltv,
      healthFactor,
    ] = await publicClient.readContract({
      address: config.protocols.aavePool,
      abi: AAVE_POOL_ABI,
      functionName: 'getUserAccountData',
      args: [address as `0x${string}`],
    });

    // Aave base values are 8 decimals (representing USD or ETH depending on Aave pool version, v3 uses USD with 8 decimals)
    const collateralUsd = Number(totalCollateralBase) / 1e8;
    const debtUsd = Number(totalDebtBase) / 1e8;
    const hf = Number(healthFactor) / 1e18; // health factor is 18 decimals

    if (collateralUsd === 0 && debtUsd === 0) return null;

    return {
      id: `aave-${chainId}`,
      protocol: 'aave',
      name: `Aave V3 (${config.name})`,
      valueUsd: collateralUsd - debtUsd,
      details: {
        collateralUsd,
        debtUsd,
        healthFactor: hf > 1000 ? 999.9 : Number(hf.toFixed(2)),
        ltv: Number(ltv) / 100, // ltv is in bps (e.g. 8000 = 80%)
      },
      chainId,
    };
  } catch (err) {
    console.warn(`[DeltaGuard] Failed to fetch Aave position for chain ${chainId}:`, err);
    return null;
  }
}

async function fetchLidoPosition(
  address: string,
  chainId: number
): Promise<DeFiPosition | null> {
  if (chainId !== mainnet.id) return null; // Lido stETH is on mainnet
  const config = CHAIN_CONFIGS[chainId];
  if (!config?.protocols?.stETH) return null;

  try {
    const publicClient = createPublicClient({
      chain: config.chain,
      transport: http(config.rpcUrl),
    });

    const balance = await publicClient.readContract({
      address: config.protocols.stETH,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [address as `0x${string}`],
    });

    const amount = Number(formatUnits(balance, 18));
    if (amount <= 0.0001) return null;

    const prices = await getTokenPricesUsd(['ETH']);
    const priceUsd = prices['ETH'] ?? 3100;

    return {
      id: `lido-${chainId}`,
      protocol: 'lido',
      name: `Lido stETH (${config.name})`,
      valueUsd: amount * priceUsd,
      details: {
        amount,
        priceUsd,
      },
      chainId,
    };
  } catch (err) {
    console.warn(`[DeltaGuard] Failed to fetch Lido position:`, err);
    return null;
  }
}

async function fetchUniswapV3Positions(
  address: string,
  chainId: number
): Promise<DeFiPosition[]> {
  const config = CHAIN_CONFIGS[chainId];
  if (!config?.protocols?.uniV3PositionManager) return [];

  try {
    const publicClient = createPublicClient({
      chain: config.chain,
      transport: http(config.rpcUrl),
    });

    const balance = await publicClient.readContract({
      address: config.protocols.uniV3PositionManager,
      abi: UNI_V3_MANAGER_ABI,
      functionName: 'balanceOf',
      args: [address as `0x${string}`],
    });

    const count = Number(balance);
    if (count === 0) return [];

    const positions: DeFiPosition[] = [];

    // Fetch details for up to 3 positions to avoid RPC limits
    const limit = Math.min(count, 3);
    for (let i = 0; i < limit; i++) {
      try {
        const tokenId = await publicClient.readContract({
          address: config.protocols.uniV3PositionManager,
          abi: UNI_V3_MANAGER_ABI,
          functionName: 'tokenOfOwnerByIndex',
          args: [address as `0x${string}`, BigInt(i)],
        });

        const [
          , , , , , , ,
          liquidity,
        ] = await publicClient.readContract({
          address: config.protocols.uniV3PositionManager,
          abi: UNI_V3_MANAGER_ABI,
          functionName: 'positions',
          args: [tokenId],
        });

        if (liquidity > 0n) {
          // Simple mock valuation for UI demonstration based on standard LP depth
          const valueUsd = 2500.0; // standard default mock value
          positions.push({
            id: `uniswap-v3-${tokenId.toString()}-${chainId}`,
            protocol: 'uniswap',
            name: `Uniswap V3 LP #${tokenId.toString()}`,
            valueUsd,
            details: {
              tokenId: tokenId.toString(),
              pairName: 'ETH/USDC',
              liquidity: liquidity.toString(),
            },
            chainId,
          });
        }
      } catch (err) {
        console.warn(`[DeltaGuard] Failed to fetch Uni V3 position index ${i}:`, err);
      }
    }

    return positions;
  } catch (err) {
    console.warn(`[DeltaGuard] Failed to fetch Uniswap V3 positions for chain ${chainId}:`, err);
    return [];
  }
}

// ─── Main Interface ──────────────────────────────────────────────────────────

export async function getDeFiPositions(
  address: string,
  chainId: number
): Promise<DeFiPosition[]> {
  const positions: DeFiPosition[] = [];

  const aavePos = await fetchAavePosition(address, chainId);
  if (aavePos) positions.push(aavePos);

  const lidoPos = await fetchLidoPosition(address, chainId);
  if (lidoPos) positions.push(lidoPos);

  const uniPositions = await fetchUniswapV3Positions(address, chainId);
  positions.push(...uniPositions);

  return positions;
}
