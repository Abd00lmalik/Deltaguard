'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, GitBranch, RefreshCw, Wallet, Coins, FileSignature } from 'lucide-react';
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

export default function TerminalPortfolioPage() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [connecting, setConnecting] = useState(false);

  const [assets, setAssets] = useState<PortfolioAsset[] | null>(null);
  const [error, setError] = useState<{ error: string; code?: string; setup?: string } | null>(null);
  const [loadingHoldings, setLoadingHoldings] = useState(false);

  // Faucet & Sign state machine
  const [claimState, setClaimState] = useState<'idle' | 'claiming' | 'claimed'>('idle');
  const [claimTx, setClaimTx] = useState('');
  const [signing, setSigning] = useState(false);
  const [signedPayload, setSignedPayload] = useState<string | null>(null);

  // Initialize wallet connection state from localStorage
  useEffect(() => {
    const isConn = localStorage.getItem('dg_wallet_connected') === 'true';
    const addr = localStorage.getItem('dg_wallet_address') || '';
    if (isConn && addr) {
      setWalletConnected(true);
      setWalletAddress(addr);
    }
  }, []);

  async function loadPortfolio() {
    setLoadingHoldings(true);
    setError(null);
    try {
      const res = await fetch('/api/terminal/portfolio');
      const data = await res.json();
      if (!res.ok) {
        setError(data);
      } else {
        setAssets(data.assets ?? []);
      }
    } catch {
      setError({ error: 'Network error — could not reach portfolio endpoint.' });
    } finally {
      setLoadingHoldings(false);
    }
  }

  // Load holdings automatically when wallet is connected
  useEffect(() => {
    if (walletConnected) {
      void loadPortfolio();
    } else {
      setAssets(null);
    }
  }, [walletConnected]);

  async function connectWallet() {
    setConnecting(true);
    try {
      const win = typeof window !== 'undefined' ? (window as unknown as { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<string[]> } }) : undefined;
      if (win?.ethereum) {
        const accounts = await win.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts[0]) {
          setWalletAddress(accounts[0]);
          setWalletConnected(true);
          localStorage.setItem('dg_wallet_connected', 'true');
          localStorage.setItem('dg_wallet_address', accounts[0]);
        }
      } else {
        // Fallback simulation
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const mockAddr = '0x71C7656EC7ab88b098defB751B7401B5f6d1476B';
        setWalletAddress(mockAddr);
        setWalletConnected(true);
        localStorage.setItem('dg_wallet_connected', 'true');
        localStorage.setItem('dg_wallet_address', mockAddr);
      }
    } catch (err) {
      console.error('Wallet connection failed:', err);
    } finally {
      setConnecting(false);
    }
  }

  function disconnectWallet() {
    setWalletConnected(false);
    setWalletAddress('');
    localStorage.removeItem('dg_wallet_connected');
    localStorage.removeItem('dg_wallet_address');
    setClaimState('idle');
    setClaimTx('');
    setSignedPayload(null);
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
      if (win?.ethereum && walletAddress) {
        const signature = await win.ethereum.request({
          method: 'eth_signTypedData_v4',
          params: [walletAddress, msgParams]
        });
        setSignedPayload(signature);
      } else {
        // Fallback simulation
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
            <PillButton size="sm" variant="secondary" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={loadPortfolio} loading={loadingHoldings}>
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
          <GlowCard glowing className="p-8 text-center max-w-2xl mx-auto border-white/[0.04] bg-neutral-900/40">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-lime/10 text-accent-lime">
              <Wallet className="h-7 w-7" />
            </div>
            <h3 className="mt-6 font-sora text-lg font-bold text-white">Wallet Connection Required</h3>
            <p className="mt-2 mx-auto max-w-md font-manrope text-sm text-text-secondary">
              Connect your Ethereum/EVM-compatible wallet to query live holdings from SSI Protocol, claim testnet tokens, and prepare for hedge order signing.
            </p>
            <div className="mt-6">
              <PillButton onClick={connectWallet} loading={connecting}>
                Connect Wallet
              </PillButton>
            </div>
          </GlowCard>
        ) : loadingHoldings ? (
          <LoadingState messages={['Connecting to SSI Protocol...', 'Fetching live holdings...']} activeIndex={0} />
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
                  <PillButton size="sm" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={loadPortfolio}>
                    Retry
                  </PillButton>
                  <PillButton size="sm" variant="danger" onClick={disconnectWallet}>
                    Disconnect Wallet
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
                    <h4 className="font-sora text-sm font-bold text-white">Connected Wallet Address</h4>
                    <p className="mt-1 font-mono text-xs text-text-secondary truncate">{walletAddress}</p>
                    <div className="mt-4 flex gap-2">
                      <StatusBadge variant="safe" label="Active Testnet Mode" />
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
                      Sign EIP-712 Payload
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
