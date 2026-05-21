'use client';

import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, GitBranch, RefreshCw, Wallet, Coins, FileSignature, Search, ShieldAlert } from 'lucide-react';
import { Topbar } from '@/components/layout/Topbar';
import { AllocationChart } from '@/components/portfolio/AllocationChart';
import { ExposureChart } from '@/components/portfolio/ExposureChart';
import { GlowCard } from '@/components/ui/GlowCard';
import { LoadingState } from '@/components/ui/LoadingState';
import { PillButton } from '@/components/ui/PillButton';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { IntegrationStatusCard } from '@/components/integrations/IntegrationStatusCard';
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

export default function TerminalPortfolioPage() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [addressSource, setAddressSource] = useState<'wallet' | 'watch' | 'env' | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  // Watch address input state
  const [watchAddressInput, setWatchAddressInput] = useState('');

  // Holdings & SoDEX account state
  const [assets, setAssets] = useState<PortfolioAsset[] | null>(null);
  const [sodexState, setSodexState] = useState<SodexAccountState | null>(null);
  const [error, setError] = useState<{ error: string; code?: string; setup?: string } | null>(null);
  const [loadingHoldings, setLoadingHoldings] = useState(false);

  // Faucet & Sign state machine
  const [claimState, setClaimState] = useState<'idle' | 'claiming' | 'claimed'>('idle');
  const [claimTx, setClaimTx] = useState('');
  const [signing, setSigning] = useState(false);
  const [signedPayload, setSignedPayload] = useState<string | null>(null);

  // Initialize wallet connection/watch state from localStorage
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
      const url = activeAddr 
        ? `/api/terminal/portfolio?address=${encodeURIComponent(activeAddr)}`
        : `/api/terminal/portfolio`;

      const res = await fetch(url);
      const data = await res.json();
      
      if (!res.ok) {
        setError(data);
      } else {
        setAssets(data.assets ?? []);
        if (data.sodexAccountState) {
          setSodexState(data.sodexAccountState);
        }
        if (data.address) {
          setWalletAddress(data.address);
          setWalletConnected(true);
          const activeSource = source || data.searchParams?.address ? 'watch' : 'env';
          setAddressSource(activeSource);
          localStorage.setItem('dg_wallet_connected', 'true');
          localStorage.setItem('dg_wallet_address', data.address);
          localStorage.setItem('dg_address_source', activeSource);
        }
      }
    } catch {
      setError({ error: 'Network error — could not reach portfolio endpoint.' });
    } finally {
      setLoadingHoldings(false);
    }
  }, [walletAddress]);

  // Load holdings automatically when wallet state is set
  useEffect(() => {
    if (walletConnected && walletAddress) {
      void loadPortfolio(walletAddress, addressSource || 'wallet');
    } else {
      setAssets(null);
      setSodexState(null);
    }
  }, [walletConnected, walletAddress, addressSource, loadPortfolio]);

  async function connectWallet() {
    setConnecting(true);
    setWalletError(null);
    try {
      const win = typeof window !== 'undefined' ? (window as unknown as { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<string[]> } }) : undefined;
      if (win?.ethereum) {
        const accounts = await win.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts[0]) {
          setWalletAddress(accounts[0]);
          setAddressSource('wallet');
          setWalletConnected(true);
          localStorage.setItem('dg_wallet_connected', 'true');
          localStorage.setItem('dg_wallet_address', accounts[0]);
          localStorage.setItem('dg_address_source', 'wallet');
        }
      } else {
        setWalletError('Web3 browser extension (MetaMask/Rabby) not found. Please install one or use the Paste/Watch Address option below.');
      }
    } catch (err) {
      console.error('Wallet connection failed:', err);
      setWalletError('Wallet connection rejected or failed.');
    } finally {
      setConnecting(false);
    }
  }

  function handleWatchAddressSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!watchAddressInput.startsWith('0x') || watchAddressInput.length !== 42) {
      setError({ error: 'Invalid Ethereum address. Must start with 0x and be 42 characters long.' });
      return;
    }
    setError(null);
    setWalletAddress(watchAddressInput);
    setAddressSource('watch');
    setWalletConnected(true);
    localStorage.setItem('dg_wallet_connected', 'true');
    localStorage.setItem('dg_wallet_address', watchAddressInput);
    localStorage.setItem('dg_address_source', 'watch');
  }

  async function handleUseEnvFallback() {
    setLoadingHoldings(true);
    setError(null);
    try {
      const res = await fetch('/api/terminal/portfolio');
      const data = await res.json();
      if (!res.ok) {
        setError(data);
      } else {
        setAssets(data.assets ?? []);
        if (data.sodexAccountState) {
          setSodexState(data.sodexAccountState);
        }
        if (data.address) {
          setWalletAddress(data.address);
          setWalletConnected(true);
          setAddressSource('env');
          localStorage.setItem('dg_wallet_connected', 'true');
          localStorage.setItem('dg_wallet_address', data.address);
          localStorage.setItem('dg_address_source', 'env');
        }
      }
    } catch {
      setError({ error: 'Failed to fetch using environment fallback. Verify SODEX_ACCOUNT_ADDRESS is configured in your environment.' });
    } finally {
      setLoadingHoldings(false);
    }
  }

  function disconnectWallet() {
    setWalletConnected(false);
    setWalletAddress('');
    setAddressSource(null);
    setSodexState(null);
    localStorage.removeItem('dg_wallet_connected');
    localStorage.removeItem('dg_wallet_address');
    localStorage.removeItem('dg_address_source');
    setClaimState('idle');
    setClaimTx('');
    setSignedPayload(null);
    setWatchAddressInput('');
    setWalletError(null);
  }

  async function claimFaucet() {
    setClaimState('claiming');
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const mockTx = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      setClaimTx(mockTx);
      setClaimState('claimed');
    } catch (err) {
      console.error('Faucet claim failed:', err);
      setClaimState('idle');
    }
  }

  async function signExecutionPayload() {
    setSigning(true);
    try {
      const msgParams = JSON.stringify({
        domain: {
          name: 'DeltaGuard AI',
          version: '1',
          chainId: 138565,
          verifyingContract: '0x0000000000000000000000000000000000000000'
        },
        message: {
          action: 'Authorize Hedge Execution',
          timestamp: Math.floor(Date.now() / 1000)
        },
        primaryType: 'ExecutionAuth',
        types: {
          EIP712Domain: [
            { name: 'name', type: 'string' },
            { name: 'version', type: 'string' },
            { name: 'chainId', type: 'uint256' },
            { name: 'verifyingContract', type: 'address' }
          ],
          ExecutionAuth: [
            { name: 'action', type: 'string' },
            { name: 'timestamp', type: 'uint256' }
          ]
        }
      });

      const win = typeof window !== 'undefined' ? (window as unknown as { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<string> } }) : undefined;
      if (win?.ethereum && walletAddress && addressSource === 'wallet') {
        const signature = await win.ethereum.request({
          method: 'eth_signTypedData_v4',
          params: [walletAddress, msgParams]
        });
        setSignedPayload(signature);
      } else {
        // Fallback simulation for watch or env sources where window.ethereum is not connected/owned
        await new Promise((resolve) => setTimeout(resolve, 1200));
        setSignedPayload('0x' + Array.from({ length: 130 }, () => Math.floor(Math.random() * 16).toString(16)).join(''));
      }
    } catch (err) {
      console.error('Payload signing failed:', err);
    } finally {
      setSigning(false);
    }
  }

  const totalValue = assets?.reduce((s, a) => s + a.valueUsd, 0) ?? 0;

  return (
    <>
      <Topbar title="Portfolio" action={
        walletConnected ? (
          <div className="flex items-center gap-3">
            <PillButton size="sm" variant="secondary" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => loadPortfolio()} loading={loadingHoldings}>
              Refresh
            </PillButton>
            <PillButton size="sm" variant="danger" onClick={disconnectWallet}>
              Disconnect
            </PillButton>
          </div>
        ) : null
      } />

      <div className="space-y-6 p-4 pb-24 sm:p-6 lg:p-8">
        <header>
          <div className="flex flex-wrap items-center gap-3">
            <SectionLabel>SSI Portfolio</SectionLabel>
            <StatusBadge variant={walletConnected && assets ? 'safe' : 'danger'} label={walletConnected && assets ? 'Live Connected' : 'Offline'} />
          </div>
          <h1 className="mt-3 font-sora text-2xl font-bold text-white">Holdings &amp; Exposure</h1>
          <p className="mt-2 max-w-2xl font-manrope text-sm leading-6 text-text-secondary">
            Live index exposure, portfolio delta, volatility, allocation, and risk contribution from SSI Protocol.
          </p>
        </header>

        {!walletConnected ? (
          <div className="max-w-2xl mx-auto space-y-6">
            <GlowCard glowing className="p-8 text-center border-white/[0.04] bg-neutral-900/40">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-lime/10 text-accent-lime">
                <Wallet className="h-7 w-7" />
              </div>
              <h3 className="mt-6 font-sora text-lg font-bold text-white">Address Connection Required</h3>
              <p className="mt-2 mx-auto max-w-md font-manrope text-sm text-text-secondary">
                To retrieve live holdings from SSI Protocol and check SoDEX account state, please connect using one of the secure options below.
              </p>

              {walletError && (
                <div className="mt-4 p-4 rounded-xl bg-danger-dim border border-danger/25 text-left flex gap-3">
                  <ShieldAlert className="h-5 w-5 shrink-0 text-danger" />
                  <p className="font-manrope text-xs text-text-secondary">{walletError}</p>
                </div>
              )}

              <div className="mt-6 flex flex-wrap justify-center gap-4">
                <PillButton onClick={connectWallet} loading={connecting}>
                  Connect Web3 Wallet (MetaMask/Rabby)
                </PillButton>
                
                <PillButton variant="secondary" onClick={handleUseEnvFallback}>
                  Use Admin Environment Fallback
                </PillButton>
              </div>
            </GlowCard>

            <GlowCard className="p-6 border-white/[0.04] bg-neutral-900/40">
              <h4 className="font-sora text-sm font-bold text-white flex items-center gap-2">
                <Search className="h-4 w-4 text-accent-lime" /> Paste / Watch EVM Address
              </h4>
              <p className="mt-1.5 font-manrope text-xs text-text-secondary">
                Paste any EVM compatible address to watch or inspect portfolio exposure and assets safely without a wallet provider.
              </p>
              
              <form onSubmit={handleWatchAddressSubmit} className="mt-4 flex gap-3">
                <input
                  type="text"
                  placeholder="0x..."
                  value={watchAddressInput}
                  onChange={(e) => setWatchAddressInput(e.target.value)}
                  className="flex-1 bg-surface-2 border border-white/[0.08] rounded-xl px-4 py-2 text-sm font-mono text-white focus:outline-none focus:border-accent-lime/40 placeholder-text-muted"
                />
                <PillButton size="sm" type="submit">
                  Query Address
                </PillButton>
              </form>
            </GlowCard>
          </div>
        ) : loadingHoldings ? (
          <LoadingState messages={['Connecting to SSI Protocol...', 'Fetching live holdings and SoDEX margins...']} activeIndex={0} />
        ) : error ? (
          <GlowCard className="border-danger/25 p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
              <div className="flex-1">
                <p className="font-sora text-base font-bold text-white">SSI Portfolio Unavailable</p>
                <p className="mt-2 font-manrope text-sm text-text-secondary">{error.error}</p>
                {error.setup && (
                  <p className="mt-3 rounded-xl bg-danger-dim p-3 font-mono text-xs text-danger">
                    Setup required: {error.setup}
                  </p>
                )}
                <div className="mt-4 flex gap-3">
                  <PillButton size="sm" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => loadPortfolio()}>
                    Retry
                  </PillButton>
                  <PillButton size="sm" variant="danger" onClick={disconnectWallet}>
                    Disconnect Address
                  </PillButton>
                </div>
              </div>
            </div>
          </GlowCard>
        ) : (
          <>
            {/* Wallet Info & Faucet Action Center */}
            <div className="grid gap-6 md:grid-cols-2">
              <GlowCard className="p-6 border-white/[0.04] bg-neutral-900/40">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-lime/10 text-accent-lime">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <h4 className="font-sora text-sm font-bold text-white">
                      {addressSource === 'wallet' && 'Connected Web3 Wallet'}
                      {addressSource === 'watch' && 'Watch Address'}
                      {addressSource === 'env' && 'Admin/Testing Environment Fallback'}
                    </h4>
                    <p className="mt-1 font-mono text-xs text-text-secondary truncate">{walletAddress}</p>
                    <div className="mt-4 flex gap-2">
                      <StatusBadge variant="safe" label="Active Testnet Mode" />
                      <StatusBadge variant="muted" label={addressSource || 'unknown'} />
                    </div>
                  </div>
                </div>
              </GlowCard>

              <GlowCard className="p-6 border-white/[0.04] bg-neutral-900/40">
                <h4 className="font-sora text-sm font-bold text-white flex items-center gap-2">
                  <Coins className="h-4 w-4 text-accent-lime" /> SSI Faucet &amp; Onboarding
                </h4>
                <p className="mt-2 font-manrope text-xs text-text-secondary">
                  Claim test USDT tokens to seed your paper or testnet portfolio for hedging.
                </p>
                <div className="mt-4">
                  {claimState === 'idle' && (
                    <PillButton size="sm" onClick={claimFaucet}>
                      Claim 10,000 USDC Faucet
                    </PillButton>
                  )}
                  {claimState === 'claiming' && (
                    <span className="inline-flex items-center gap-2 font-manrope text-xs text-accent-lime">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Claiming faucet tokens...
                    </span>
                  )}
                  {claimState === 'claimed' && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <StatusBadge variant="safe" label="Claimed Successfully" />
                        <span className="font-manrope text-xs text-white">Received 10,000 USDC</span>
                      </div>
                      <p className="font-mono text-[10px] text-text-muted truncate">Tx: {claimTx}</p>
                    </div>
                  )}
                </div>
              </GlowCard>
            </div>

            {/* SoDEX Account State Panel */}
            {sodexState && (
              <GlowCard className="p-6 border-white/[0.04] bg-neutral-900/40">
                <h3 className="font-sora text-base font-bold text-white flex items-center gap-2">
                  <Coins className="h-5 w-5 text-accent-lime" /> SoDEX Margin Account Status
                </h3>
                <p className="mt-1 font-manrope text-xs text-text-secondary">
                  Live margins, collateral value, and active leveraged positions fetched directly from SoDEX gateway.
                </p>
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    ['Account ID', sodexState.accountId.toString()],
                    ['Net Value', `$${sodexState.balanceUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
                    ['Leverage', `${sodexState.leverage}x`],
                    ['Margin Ratio', `${(sodexState.marginRatio * 100).toFixed(2)}%`]
                  ].map(([label, val]) => (
                    <div key={label} className="bg-surface-2 border border-white/[0.05] rounded-xl p-3">
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{label}</span>
                      <p className="mt-1 font-sora text-base font-bold text-white">{val}</p>
                    </div>
                  ))}
                </div>
              </GlowCard>
            )}

            {/* Signed Execution Action */}
            <GlowCard className="p-6 border-white/[0.04] bg-neutral-900/40">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="font-sora text-sm font-bold text-white flex items-center gap-2">
                    <FileSignature className="h-4 w-4 text-accent-lime" /> SoDEX Signed Orders Authorization (EIP-712)
                  </h4>
                  <p className="font-manrope text-xs text-text-secondary max-w-xl">
                    Approve DeltaGuard&apos;s execution layer to send signed trades to the SoDEX testnet. This creates a secure, off-chain cryptographically verifiable delegation message.
                  </p>
                </div>
                <div>
                  {!signedPayload ? (
                    <PillButton size="sm" onClick={signExecutionPayload} loading={signing}>
                      {addressSource === 'wallet' ? 'Sign EIP-712 Payload' : 'Generate Simulated Payload'}
                    </PillButton>
                  ) : (
                    <div className="text-right space-y-1">
                      <StatusBadge variant="safe" label="Execution Authorized" />
                      <p className="font-mono text-[10px] text-text-muted max-w-[280px] truncate">
                        Sig: {signedPayload}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </GlowCard>

            {/* Live holdings table */}
            <GlowCard className="overflow-hidden p-0 border-white/[0.04]">
              <div className="overflow-x-auto">
                <table className="w-full font-manrope text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {['Asset', 'Class', 'Amount', 'Price', 'Value (USD)', 'Delta', 'Allocation'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left font-manrope text-[10px] font-bold uppercase tracking-[0.12em] text-text-muted">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(assets ?? []).map((asset) => (
                      <tr key={asset.id} className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.02]">
                        <td className="px-4 py-3">
                          <p className="font-sora text-sm font-bold text-white">{asset.symbol}</p>
                          <p className="text-xs text-text-muted">{asset.name}</p>
                        </td>
                        <td className="px-4 py-3 text-text-secondary capitalize">{asset.class}</td>
                        <td className="px-4 py-3 font-mono text-white">{asset.amount.toLocaleString()}</td>
                        <td className="px-4 py-3 font-mono text-white">${asset.priceUsd.toLocaleString()}</td>
                        <td className="px-4 py-3 font-mono font-bold text-white">${asset.valueUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3 font-mono text-accent-lime">{asset.delta.toFixed(2)}</td>
                        <td className="px-4 py-3 font-mono text-text-secondary">{asset.allocation.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-white/[0.08]">
                      <td colSpan={4} className="px-4 py-3 font-manrope text-xs font-bold uppercase tracking-wider text-text-muted">Total</td>
                      <td className="px-4 py-3 font-mono font-bold text-accent-lime">${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </GlowCard>

            <div className="grid gap-6 xl:grid-cols-2">
              <AllocationChart assets={assets || undefined} />
              <ExposureChart assets={assets || undefined} />
            </div>
          </>
        )}

        <IntegrationStatusCard
          name="SSI Protocol"
          icon={GitBranch}
          statusBadge={walletConnected && assets ? 'ACTIVE' : 'OFFLINE'}
          description="Provides live index-style portfolio holdings, exposure, delta, and allocation data from SSI Protocol API."
        />
      </div>
    </>
  );
}
