/**
 * DeltaGuard AI — Wagmi Configuration
 * Initializes all 4 chains at startup with Alchemy RPC transports.
 * Runtime chain selection is controlled by NetworkContext (isTestnet toggle).
 */

import { createConfig, http } from 'wagmi';
import { mainnet, base, optimism, sepolia } from 'wagmi/chains';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';

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
    [mainnet.id]:  http(),
    [base.id]:     http(),
    [optimism.id]: http(),
    [sepolia.id]:  http(),
  },
  ssr: true, // Required for Next.js App Router
});
