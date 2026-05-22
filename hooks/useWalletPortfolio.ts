import { useState, useCallback, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected, coinbaseWallet } from 'wagmi/connectors';
import { getOnChainPortfolio } from '@/lib/wallet/portfolio';
import { useNetwork } from '@/lib/store/network-context';
import type { PortfolioAsset } from '@/types/portfolio';

interface SodexAccountState {
  address: string;
  accountId: number;
  balanceUsd: number;
  marginRatio: number;
  leverage: number;
  positionsCount: number;
  collateralUsd: number;
}

export function useWalletPortfolio() {
  // ── Wagmi native wallet state ──────────────────────────────────────────────
  const { address: wagmiAddress, isConnected: wagmiConnected, chainId: wagmiChainId } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { isTestnet, activeChainId } = useNetwork();

  // ── Watch-only address overlay (paste-to-watch mode) ─────────────────────
  const [watchAddress, setWatchAddress] = useState<string>('');
  const [addressSource, setAddressSource] = useState<'wallet' | 'watch' | 'env' | null>(null);

  // ── Portfolio state ────────────────────────────────────────────────────────
  const [assets, setAssets] = useState<PortfolioAsset[] | null>(null);
  const [sodexState, setSodexState] = useState<SodexAccountState | null>(null);
  const [loadingHoldings, setLoadingHoldings] = useState(false);
  const [error, setError] = useState<{ error: string; code?: string; setup?: string } | null>(null);

  // Derived: effective wallet address (wallet > watch > env fallback)
  const walletAddress = wagmiConnected && wagmiAddress
    ? wagmiAddress.toLowerCase()
    : watchAddress || '';

  const walletConnected = wagmiConnected || !!watchAddress;

  // Re-derive address source whenever state changes
  useEffect(() => {
    if (wagmiConnected && wagmiAddress) {
      setAddressSource('wallet');
    } else if (watchAddress) {
      setAddressSource('watch');
    } else {
      setAddressSource(null);
    }
  }, [wagmiConnected, wagmiAddress, watchAddress]);

  const loadPortfolio = useCallback(async (addressToLoad?: string, source?: 'wallet' | 'watch' | 'env') => {
    setLoadingHoldings(true);
    setError(null);
    try {
      const activeAddr = addressToLoad || walletAddress;
      const chainId = activeChainId;

      let fetchedAssets: PortfolioAsset[] = [];
      let fetchedSodexState: SodexAccountState | null = null;

      const headers: Record<string, string> = {};
      const customApiKey = localStorage.getItem('dg_sodex_api_key');
      if (customApiKey) {
        headers['x-sodex-api-key'] = customApiKey;
      }

      // Fetch SoDEX account state
      const url = activeAddr
        ? `/api/terminal/portfolio?address=${encodeURIComponent(activeAddr)}&chainId=${chainId}`
        : `/api/terminal/portfolio?chainId=${chainId}`;

      const res = await fetch(url, { headers });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch portfolio');
      }

      if (data.sodexAccountState) {
        fetchedSodexState = data.sodexAccountState;
      }

      const usedAddress = data.address || activeAddr;

      // Fetch on-chain assets if we have an address
      if (usedAddress) {
        try {
          fetchedAssets = await getOnChainPortfolio(usedAddress, chainId);
        } catch (err) {
          console.error('Failed to read on-chain portfolio', err);
        }
      }

      setAssets(fetchedAssets);
      setSodexState(fetchedSodexState);

      if (source) {
        setAddressSource(source);
      }
    } catch (err) {
      setError({ error: err instanceof Error ? err.message : 'Network error — could not reach portfolio endpoint.' });
    } finally {
      setLoadingHoldings(false);
    }
  }, [walletAddress, activeChainId]);

  // Auto-reload portfolio when wallet connects or network changes
  useEffect(() => {
    if (walletConnected && walletAddress) {
      void loadPortfolio(walletAddress, addressSource || 'wallet');
    } else {
      setAssets(null);
      setSodexState(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletConnected, walletAddress, activeChainId]);

  // ── Wallet connect helpers ────────────────────────────────────────────────
  const connectWallet = async (
    setConnecting: (val: boolean) => void,
    setWalletError: (err: string | null) => void
  ) => {
    setConnecting(true);
    setWalletError(null);
    try {
      // Prefer injected (MetaMask/Rabby), fall back to Coinbase Wallet
      await connect({ connector: injected() });
    } catch (err) {
      console.error('Wallet connection failed:', err);
      // If injected not found, try Coinbase Wallet
      try {
        await connect({ connector: coinbaseWallet({ appName: 'DeltaGuard AI' }) });
      } catch {
        setWalletError(
          err instanceof Error
            ? err.message
            : 'No Web3 wallet found. Install MetaMask or Rabby.'
        );
      }
    } finally {
      setConnecting(false);
    }
  };

  const handleWatchAddressSubmit = (
    input: string,
    setErrorForm: (err: { error: string; code?: string; setup?: string } | null) => void
  ) => {
    if (!input.startsWith('0x') || input.length !== 42) {
      setErrorForm({ error: 'Invalid Ethereum address. Must start with 0x and be 42 characters long.' });
      return;
    }
    setErrorForm(null);
    setWatchAddress(input.toLowerCase());
  };

  const disconnectWallet = () => {
    if (wagmiConnected) {
      disconnect();
    }
    setWatchAddress('');
    setAddressSource(null);
    setSodexState(null);
    setAssets(null);
  };

  return {
    walletConnected,
    walletAddress,
    addressSource,
    chainId: wagmiChainId ?? activeChainId,
    assets,
    sodexState,
    loadingHoldings,
    error,
    loadPortfolio,
    connectWallet,
    handleWatchAddressSubmit,
    disconnectWallet,
    setError,
  };
}
