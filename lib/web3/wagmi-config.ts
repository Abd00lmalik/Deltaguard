/**
 * DeltaGuard AI — Wagmi Configuration
 * Initializes all 4 chains at startup with Alchemy RPC transports.
 * Runtime chain selection is controlled by NetworkContext (isTestnet toggle).
 */

import { createConfig, http } from 'wagmi';
import { mainnet, base, optimism, sepolia } from 'wagmi/chains';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';

const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ?? '';

function alchemyTransport(network: string) {
  if (alchemyKey) {
    return http(`https://${network}.g.alchemy.com/v2/${alchemyKey}`);
  }
  return http(); // public fallback RPC
}

// WalletConnect project ID (optional, enables WalletConnect v2 support)
const wcProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? 'deltaguard-ai';

export const wagmiConfig = createConfig({
  // All 4 chains initialized at startup — network selection is runtime-dynamic
  chains: [mainnet, base, optimism, sepolia],
  connectors: [
    injected({ target: 'metaMask' }),
    injected(), // Rabby, Frame, and other injected wallets
    coinbaseWallet({ appName: 'DeltaGuard AI' }),
    walletConnect({ projectId: wcProjectId }),
  ],
  transports: {
    [mainnet.id]:  alchemyTransport('eth-mainnet'),
    [base.id]:     alchemyTransport('base-mainnet'),
    [optimism.id]: alchemyTransport('opt-mainnet'),
    [sepolia.id]:  alchemyTransport('eth-sepolia'),
  },
  ssr: true, // Required for Next.js App Router
});
