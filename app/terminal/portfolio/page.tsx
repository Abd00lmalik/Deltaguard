'use client';

import { useState } from 'react';
import { AlertTriangle, GitBranch, RefreshCw, Wallet, Coins, FileSignature, Search, ArrowUpRight, FlaskConical } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Topbar } from '@/components/layout/Topbar';
import { AllocationChart } from '@/components/portfolio/AllocationChart';
import { ExposureChart } from '@/components/portfolio/ExposureChart';
import { GlowCard } from '@/components/ui/GlowCard';
import { LoadingState } from '@/components/ui/LoadingState';
import { PillButton } from '@/components/ui/PillButton';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { IntegrationStatusCard } from '@/components/integrations/IntegrationStatusCard';
import { useWalletPortfolio } from '@/hooks/useWalletPortfolio';
import { useNetwork } from '@/lib/store/network-context';

export default function TerminalPortfolioPage() {
  const {
    walletConnected,
    walletAddress,
    addressSource,
    assets,
    sodexState,
    loadingHoldings,
    error,
    loadPortfolio,
    handleWatchAddressSubmit,
    disconnectWallet,
    setError
  } = useWalletPortfolio();
  const { isTestnet, networkLabel, toggleNetwork } = useNetwork();

  const [watchAddressInput, setWatchAddressInput] = useState('');
  
  const [signing, setSigning] = useState(false);
  const [signedPayload, setSignedPayload] = useState<string | null>(null);

  async function signExecutionPayload() {
    if (addressSource !== 'wallet') {
      setError({ error: 'Signing requires an active Web3 wallet connection. Watch or env fallback cannot sign.' });
      return;
    }
    
    setSigning(true);
    try {
      const msgParams = JSON.stringify({
        domain: {
          name: 'DeltaGuard AI',
          version: '1',
          chainId: 11155111,
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
            <SectionLabel>Live Portfolio</SectionLabel>
            <StatusBadge variant={walletConnected && assets ? 'safe' : 'danger'} label={walletConnected && assets ? 'Live Connected' : 'Offline'} />
          </div>
          <h1 className="mt-3 font-sora text-2xl font-bold text-white">Holdings &amp; Exposure</h1>
          <p className="mt-2 max-w-2xl font-manrope text-sm leading-6 text-text-secondary">
            Live on-chain index exposure, portfolio delta, volatility, allocation, and risk contribution fetched directly from the blockchain.
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
                To retrieve live on-chain holdings and check SoDEX account state, please connect using one of the secure options below.
              </p>

              {/* RainbowKit handles MetaMask, Rabby, Coinbase Wallet, WalletConnect natively */}
              <div className="mt-6 flex flex-wrap justify-center gap-4">
                <ConnectButton label="Connect Wallet" />
              </div>
            </GlowCard>

            <GlowCard className="p-6 border-white/[0.04] bg-neutral-900/40">
              <h4 className="font-sora text-sm font-bold text-white flex items-center gap-2">
                <Search className="h-4 w-4 text-accent-lime" /> Paste / Watch EVM Address
              </h4>
              <p className="mt-1.5 font-manrope text-xs text-text-secondary">
                Paste any EVM compatible address to watch or inspect portfolio exposure and assets safely without a wallet provider.
              </p>
              
              <form onSubmit={(e) => { e.preventDefault(); handleWatchAddressSubmit(watchAddressInput, setError); }} className="mt-4 flex gap-3">
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
          <LoadingState messages={['Connecting to public RPC...', 'Fetching live on-chain holdings and SoDEX margins...']} activeIndex={0} />
        ) : error ? (
          <GlowCard className="border-danger/25 p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
              <div className="flex-1">
                <p className="font-sora text-base font-bold text-white">Portfolio Fetch Failed</p>
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
                      <StatusBadge variant={isTestnet ? 'warning' : 'safe'} label={`Network: ${networkLabel}`} />
                    <StatusBadge variant="muted" label={addressSource || 'unknown'} />
                    <button
                      onClick={toggleNetwork}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1 font-manrope text-[10px] font-bold uppercase tracking-wider text-text-muted hover:bg-white/[0.10] hover:text-white transition-colors"
                    >
                      <FlaskConical className="h-3 w-3" />
                      {isTestnet ? 'Switch to Mainnet' : 'Switch to Testnet'}
                    </button>
                    </div>
                  </div>
                </div>
              </GlowCard>

              <GlowCard className="p-6 border-white/[0.04] bg-neutral-900/40">
                <h4 className="font-sora text-sm font-bold text-white flex items-center gap-2">
                  <Coins className="h-4 w-4 text-accent-lime" /> Testnet Faucets
                </h4>
                <p className="mt-2 font-manrope text-xs text-text-secondary">
                  Ensure your wallet has Sepolia ETH and testnet tokens for execution. Get real tokens directly from official faucets.
                </p>
                <div className="mt-4 flex gap-3">
                  <a href="https://sepoliafaucet.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-manrope text-xs font-bold text-accent-lime hover:text-white transition-colors">
                    Sepolia ETH Faucet <ArrowUpRight className="h-3 w-3" />
                  </a>
                  <a href="https://docs.sodex.io/faucet" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-manrope text-xs font-bold text-accent-lime hover:text-white transition-colors">
                    SoDEX Testnet Tokens <ArrowUpRight className="h-3 w-3" />
                  </a>
                </div>
              </GlowCard>
            </div>

            {sodexState ? (
              <GlowCard className="p-6 border-white/[0.04] bg-neutral-900/40">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="font-sora text-base font-bold text-white flex items-center gap-2">
                    <Coins className="h-5 w-5 text-accent-lime" /> SoDEX Margin Account Status
                  </h3>
                </div>
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
             ) : (
               <GlowCard className="p-6 border-amber-500/20 bg-amber-500/[0.04]">
                 <h3 className="font-sora text-base font-bold text-white flex items-center gap-2">
                   <AlertTriangle className="h-5 w-5 text-amber-400" /> SoDEX Futures Account Not Detected
                 </h3>
                 <p className="mt-2 font-manrope text-xs text-text-secondary leading-5">
                   DeltaGuard could not find an active SoDEX <strong className="text-white">Futures/Perpetuals margin account</strong> for this wallet address.
                   Your on-chain assets (ETH, USDC) are still shown below and the AI agent can still analyze your portfolio.
                 </p>
                 <p className="mt-3 font-manrope text-xs text-amber-400 leading-5">
                   To enable hedge execution: go to <strong>testnet.sodex.com → Futures tab → deposit USDC as collateral</strong> to open a margin account. Once done, refresh this page.
                 </p>
               </GlowCard>
            )}


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
                    <PillButton size="sm" onClick={signExecutionPayload} loading={signing} disabled={addressSource !== 'wallet'}>
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
                  {addressSource !== 'wallet' && !signedPayload && (
                    <p className="mt-2 text-right font-manrope text-[10px] text-warning">
                      * Web3 wallet connection required to sign.
                    </p>
                  )}
                </div>
              </div>
            </GlowCard>

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
                    {assets?.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center font-manrope text-sm text-text-muted">
                          No assets found on Sepolia for this address.
                        </td>
                      </tr>
                    )}
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
          name="EVM On-Chain RPC"
          icon={GitBranch}
          statusBadge={walletConnected && assets ? 'ACTIVE' : 'OFFLINE'}
          description={`Provides live ERC20 token balances and native ETH via ${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ? 'Alchemy Token API (auto-discovery enabled)' : 'public RPC (static token list)'} on ${networkLabel}.`}
        />
      </div>
    </>
  );
}
