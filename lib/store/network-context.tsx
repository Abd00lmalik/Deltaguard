'use client';

/**
 * DeltaGuard AI — Runtime Network Context
 * Controls the global `isTestnet` flag without a rebuild.
 * All engines (Portfolio Resolver, Execution Engine, EIP-712 domain)
 * subscribe to this context and hot-swap their configurations when it changes.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { sepolia } from 'viem/chains';
import { getActiveChainId } from '@/lib/web3/chains';

const STORAGE_KEY = 'dg_network_testnet';

export interface NetworkContextValue {
  isTestnet: boolean;
  activeChainId: number;
  networkLabel: string;
  toggleNetwork: () => void;
  setTestnet: (v: boolean) => void;
}

const NetworkContext = createContext<NetworkContextValue>({
  isTestnet: true,
  activeChainId: sepolia.id,
  networkLabel: 'Sepolia Testnet',
  toggleNetwork: () => {},
  setTestnet: () => {},
});

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [isTestnet, setIsTestnetState] = useState<boolean>(true);

  // Rehydrate from localStorage on mount (SSR-safe)
  useEffect(() => {
    const stored = typeof window !== 'undefined'
      ? localStorage.getItem(STORAGE_KEY)
      : null;
    // Default to testnet if no setting stored yet
    setIsTestnetState(stored === 'mainnet' ? false : true);
  }, []);

  const setTestnet = useCallback((v: boolean) => {
    setIsTestnetState(v);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, v ? 'testnet' : 'mainnet');
    }
  }, []);

  const toggleNetwork = useCallback(() => {
    setTestnet(!isTestnet);
  }, [isTestnet, setTestnet]);

  const activeChainId = getActiveChainId(isTestnet);

  const networkLabel = isTestnet
    ? 'Sepolia Testnet'
    : 'Ethereum Mainnet';

  return (
    <NetworkContext.Provider
      value={{ isTestnet, activeChainId, networkLabel, toggleNetwork, setTestnet }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}
