import { useState, useCallback, useEffect } from 'react';
import { getOnChainPortfolio } from '@/lib/wallet/portfolio';
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
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [addressSource, setAddressSource] = useState<'wallet' | 'watch' | 'env' | null>(null);
  
  const [assets, setAssets] = useState<PortfolioAsset[] | null>(null);
  const [sodexState, setSodexState] = useState<SodexAccountState | null>(null);
  const [loadingHoldings, setLoadingHoldings] = useState(false);
  const [error, setError] = useState<{ error: string; code?: string; setup?: string } | null>(null);

  useEffect(() => {
    const isConn = localStorage.getItem('dg_wallet_connected') === 'true';
    const addr = localStorage.getItem('dg_wallet_address') || '';
    const src = localStorage.getItem('dg_address_source') as 'wallet' | 'watch' | 'env' | null;
    if (isConn && addr) {
      setWalletConnected(true);
      setWalletAddress(addr);
      setAddressSource(src || 'wallet');
    }
  }, []);

  const loadPortfolio = useCallback(async (addressToLoad?: string, source?: 'wallet' | 'watch' | 'env') => {
    setLoadingHoldings(true);
    setError(null);
    try {
      const activeAddr = addressToLoad || walletAddress;
      
      let fetchedAssets: PortfolioAsset[] = [];
      let fetchedSodexState: SodexAccountState | null = null;
      let usedAddress = activeAddr;

      // Fetch SoDEX State
      const url = activeAddr 
        ? `/api/terminal/portfolio?address=${encodeURIComponent(activeAddr)}`
        : `/api/terminal/portfolio`;
      
      const res = await fetch(url);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch SoDEX state');
      }

      if (data.sodexAccountState) {
        fetchedSodexState = data.sodexAccountState;
      }
      if (data.address) {
        usedAddress = data.address;
      }

      // Fetch On-chain assets if we have an address
      if (usedAddress) {
        try {
          fetchedAssets = await getOnChainPortfolio(usedAddress);
        } catch (err) {
          console.error('Failed to read on-chain portfolio', err);
          // Non-blocking error, just set empty assets
        }
      }

      setAssets(fetchedAssets);
      setSodexState(fetchedSodexState);
      
      if (usedAddress) {
        setWalletAddress(usedAddress);
        setWalletConnected(true);
        const activeSource = source ?? (data.searchParams?.address ? 'watch' : 'env');
        setAddressSource(activeSource);
        localStorage.setItem('dg_wallet_connected', 'true');
        localStorage.setItem('dg_wallet_address', usedAddress);
        localStorage.setItem('dg_address_source', activeSource);
      }
    } catch (err) {
      setError({ error: err instanceof Error ? err.message : 'Network error — could not reach portfolio endpoint.' });
    } finally {
      setLoadingHoldings(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    if (walletConnected && walletAddress) {
      void loadPortfolio(walletAddress, addressSource || 'wallet');
    } else {
      setAssets(null);
      setSodexState(null);
    }
  }, [walletConnected, walletAddress, addressSource, loadPortfolio]);

  const connectWallet = async (setConnecting: (val: boolean) => void, setWalletError: (err: string | null) => void) => {
    setConnecting(true);
    setWalletError(null);
    try {
      type EthereumProvider = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
      const ethereum = typeof window !== 'undefined'
        ? (window as unknown as { ethereum?: EthereumProvider }).ethereum
        : undefined;

      if (!ethereum) {
        setWalletError('Web3 browser extension (MetaMask/Rabby) not found. Please install one or use the Paste/Watch Address option below.');
        return;
      }

      // Force MetaMask to show the account picker every time — even if already connected.
      // wallet_requestPermissions triggers the popup regardless of cached sessions,
      // making this work correctly for multi-user scenarios where different users
      // may share the same browser or switch accounts.
      try {
        await ethereum.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }]
        });
      } catch {
        // User dismissed the permissions popup — treat as cancellation
        setWalletError('Wallet connection cancelled. Please try again and approve in MetaMask.');
        return;
      }

      // After permissions granted, get the selected accounts
      const accounts = await ethereum.request({ method: 'eth_accounts' }) as string[];
      if (accounts && accounts[0]) {
        const addr = accounts[0].toLowerCase();
        setWalletAddress(addr);
        setAddressSource('wallet');
        setWalletConnected(true);
        localStorage.setItem('dg_wallet_connected', 'true');
        localStorage.setItem('dg_wallet_address', addr);
        localStorage.setItem('dg_address_source', 'wallet');
      } else {
        setWalletError('No account selected. Please select an account in MetaMask.');
      }
    } catch (err) {
      console.error('Wallet connection failed:', err);
      setWalletError(err instanceof Error ? err.message : 'Wallet connection rejected or failed.');
    } finally {
      setConnecting(false);
    }
  };

  const handleWatchAddressSubmit = (watchAddressInput: string, setErrorForm: (err: { error: string; code?: string; setup?: string } | null) => void) => {
    if (!watchAddressInput.startsWith('0x') || watchAddressInput.length !== 42) {
      setErrorForm({ error: 'Invalid Ethereum address. Must start with 0x and be 42 characters long.' });
      return;
    }
    setErrorForm(null);
    setWalletAddress(watchAddressInput);
    setAddressSource('watch');
    setWalletConnected(true);
    localStorage.setItem('dg_wallet_connected', 'true');
    localStorage.setItem('dg_wallet_address', watchAddressInput);
    localStorage.setItem('dg_address_source', 'watch');
  };

  const disconnectWallet = () => {
    setWalletConnected(false);
    setWalletAddress('');
    setAddressSource(null);
    setSodexState(null);
    setAssets(null);
    localStorage.removeItem('dg_wallet_connected');
    localStorage.removeItem('dg_wallet_address');
    localStorage.removeItem('dg_address_source');
    // Note: MetaMask permissions are site-wide and cannot be revoked by JS.
    // The next connectWallet call uses wallet_requestPermissions which forces
    // the account picker regardless — so switching users works correctly.
  };

  return {
    walletConnected,
    walletAddress,
    addressSource,
    assets,
    sodexState,
    loadingHoldings,
    error,
    loadPortfolio,
    connectWallet,
    handleWatchAddressSubmit,
    disconnectWallet,
    setError
  };
}
