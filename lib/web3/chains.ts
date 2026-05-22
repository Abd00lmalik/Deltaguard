/**
 * DeltaGuard AI — Supported Chain Configurations
 * All four chains are initialized at startup. The active chain is selected
 * at runtime via the NetworkContext isTestnet toggle — no rebuild required.
 */

import { mainnet, base, optimism, sepolia } from 'viem/chains';
import type { Chain } from 'viem';

// Token contract addresses per chain
export interface ChainTokenAddresses {
  usdc: `0x${string}`;
  wbtc?: `0x${string}`;
  weth?: `0x${string}`;
  dai?: `0x${string}`;
  link?: `0x${string}`;
}

// DeFi protocol addresses per chain
export interface ChainProtocolAddresses {
  aavePool?: `0x${string}`;       // Aave v3 Pool
  aaveDataProvider?: `0x${string}`; // Aave Protocol Data Provider
  stETH?: `0x${string}`;          // Lido stETH
  wstETH?: `0x${string}`;         // Lido wstETH
  uniV3PositionManager?: `0x${string}`; // Uniswap V3 NonfungiblePositionManager
}

export interface DeltaGuardChainConfig {
  chain: Chain;
  chainId: number;
  name: string;
  isTestnet: boolean;
  rpcUrl: string;                 // Alchemy RPC (filled at runtime from env)
  blockExplorer: string;
  tokens: ChainTokenAddresses;
  protocols: ChainProtocolAddresses;
  alchemyNetwork: string;         // Network slug for Alchemy Token API
}

// Alchemy base URL builder
function alchemyRpc(network: string): string {
  const key = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ?? process.env.ALCHEMY_API_KEY ?? '';
  if (!key) return '';
  return `https://${network}.g.alchemy.com/v2/${key}`;
}

export const CHAIN_CONFIGS: Record<number, DeltaGuardChainConfig> = {
  // ─── Mainnet ──────────────────────────────────────────────────────────────
  [mainnet.id]: {
    chain: mainnet,
    chainId: mainnet.id,
    name: 'Ethereum',
    isTestnet: false,
    rpcUrl: alchemyRpc('eth-mainnet'),
    blockExplorer: 'https://etherscan.io',
    alchemyNetwork: 'eth-mainnet',
    tokens: {
      usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      wbtc: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
      weth: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      dai:  '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      link: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
    },
    protocols: {
      aavePool:         '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
      aaveDataProvider: '0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3',
      stETH:            '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
      wstETH:           '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
      uniV3PositionManager: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
    },
  },

  // ─── Base ─────────────────────────────────────────────────────────────────
  [base.id]: {
    chain: base,
    chainId: base.id,
    name: 'Base',
    isTestnet: false,
    rpcUrl: alchemyRpc('base-mainnet'),
    blockExplorer: 'https://basescan.org',
    alchemyNetwork: 'base-mainnet',
    tokens: {
      usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      weth: '0x4200000000000000000000000000000000000006',
      dai:  '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
    },
    protocols: {
      aavePool:         '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
      aaveDataProvider: '0x2d8A3C5677189723C4cB8873CfC9C8976ddf54D8',
      uniV3PositionManager: '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1',
    },
  },

  // ─── Optimism ─────────────────────────────────────────────────────────────
  [optimism.id]: {
    chain: optimism,
    chainId: optimism.id,
    name: 'Optimism',
    isTestnet: false,
    rpcUrl: alchemyRpc('opt-mainnet'),
    blockExplorer: 'https://optimistic.etherscan.io',
    alchemyNetwork: 'opt-mainnet',
    tokens: {
      usdc: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      wbtc: '0x68f180fcCe6836688e9084f035309E29Bf0A2095',
      weth: '0x4200000000000000000000000000000000000006',
      dai:  '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      link: '0x350a791Bfc2C21F9Ed5d10980Dad2e2638ffa7f6',
    },
    protocols: {
      aavePool:         '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
      aaveDataProvider: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',
      uniV3PositionManager: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
    },
  },

  // ─── Sepolia (Testnet) ───────────────────────────────────────────────────
  [sepolia.id]: {
    chain: sepolia,
    chainId: sepolia.id,
    name: 'Sepolia',
    isTestnet: true,
    rpcUrl: alchemyRpc('eth-sepolia'),
    blockExplorer: 'https://sepolia.etherscan.io',
    alchemyNetwork: 'eth-sepolia',
    tokens: {
      usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      wbtc: '0x29f2D40B0605204364af54EC677bD022dA425d03',
      weth: '0x7b79995e5f793a07bc00c21412e50ecae098e7f9',
      dai:  '0x3e622317f8C93f732A4141a59b659CE7d4F76964',
      link: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
    },
    protocols: {
      // Aave v3 Sepolia testnet
      aavePool:         '0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951',
      aaveDataProvider: '0x927F584d4321C1dCcBf5e2902368124b02419a1E',
    },
  },
};

export const DEFAULT_MAINNET_CHAIN_ID = mainnet.id;
export const DEFAULT_TESTNET_CHAIN_ID = sepolia.id;

export function getChainConfig(chainId: number): DeltaGuardChainConfig | null {
  return CHAIN_CONFIGS[chainId] ?? null;
}

export function getActiveChainId(isTestnet: boolean): number {
  return isTestnet ? DEFAULT_TESTNET_CHAIN_ID : DEFAULT_MAINNET_CHAIN_ID;
}

export const ALL_SUPPORTED_CHAINS = [mainnet, base, optimism, sepolia];
