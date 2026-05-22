'use client';

/**
 * DeltaGuard AI — Web3 Provider Stack
 * Wraps the app in Wagmi + RainbowKit + TanStack Query.
 * NetworkProvider adds the runtime isTestnet toggle on top.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { wagmiConfig } from '@/lib/web3/wagmi-config';
import { NetworkProvider } from '@/lib/store/network-context';
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 2,
    },
  },
});

const rainbowTheme = darkTheme({
  accentColor: '#9CFF00',
  accentColorForeground: '#000000',
  borderRadius: 'large',
  fontStack: 'system',
  overlayBlur: 'small',
});

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={rainbowTheme}
          appInfo={{
            appName: 'DeltaGuard AI',
            learnMoreUrl: 'https://deltaguard.ai',
          }}
        >
          <NetworkProvider>
            {children}
          </NetworkProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
