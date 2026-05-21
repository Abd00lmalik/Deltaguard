'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, RefreshCw, XCircle } from 'lucide-react';
import { Topbar } from '@/components/layout/Topbar';
import { ExecutionTimeline } from '@/components/execution/ExecutionTimeline';
import { GlowCard } from '@/components/ui/GlowCard';
import { LoadingState } from '@/components/ui/LoadingState';
import { PillButton } from '@/components/ui/PillButton';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { OrderTimelineStep } from '@/types/execution';

type ExecutionPhase =
  | 'AWAITING_USER_APPROVAL'
  | 'APPROVED'
  | 'ORDER_PREPARING'
  | 'ORDER_SUBMITTED'
  | 'FILLED'
  | 'FAILED'
  | 'CANCELLED';

interface ExecutionState {
  phase: ExecutionPhase;
  hedgeOrder: {
    id: string;
    pair: string;
    direction: 'long' | 'short';
    leverage: number;
    notionalUsd: number;
    estimatedPrice: number;
    timeline: OrderTimelineStep[];
  };
  orderId?: string;
  updatedAt: string;
  log: { phase: ExecutionPhase; timestamp: string; message: string }[];
}

function phaseBadge(phase: ExecutionPhase): 'signal' | 'warning' | 'safe' | 'danger' | 'muted' {
  if (phase === 'FILLED') return 'safe';
  if (phase === 'FAILED') return 'danger';
  if (phase === 'CANCELLED') return 'muted';
  if (phase === 'AWAITING_USER_APPROVAL') return 'warning';
  return 'signal';
}

export default function TerminalExecutionPage() {
  const [state, setState] = useState<ExecutionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupWarning, setSetupWarning] = useState<string[] | null>(null);

  async function fetchStatus() {
    setLoading(true);
    try {
      const res = await fetch('/api/terminal/execution/status');
      const data = await res.json();
      setState(data as ExecutionState);
      setError(null);
    } catch {
      setError('Could not reach execution status endpoint.');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    setApproving(true);
    setSetupWarning(null);
    try {
      const res = await fetch('/api/terminal/execution/approve', { method: 'POST' });
      const data = await res.json();
      if (data.executionStopped) {
        setSetupWarning(data.setupRequired ?? []);
      }
      if (data.state) setState(data.state as ExecutionState);
    } catch {
      setError('Failed to submit approval — network error.');
    } finally {
      setApproving(false);
    }
  }

  async function handleCancel() {
    try {
      const res = await fetch('/api/terminal/execution/cancel', { method: 'POST' });
      const data = await res.json();
      setState(data as ExecutionState);
    } catch {
      setError('Failed to cancel execution.');
    }
  }

  async function handleReset() {
    try {
      const res = await fetch('/api/terminal/execution/reset', { method: 'POST' });
      const data = await res.json();
      setState(data as ExecutionState);
      setSetupWarning(null);
      setError(null);
    } catch {
      setError('Failed to reset execution state.');
    }
  }

  useEffect(() => { void fetchStatus(); }, []);

  const phase = state?.phase ?? 'AWAITING_USER_APPROVAL';
  const order = state?.hedgeOrder;

  return (
    <>
      <Topbar
        title="Execution Console"
        action={
          <div className="flex items-center gap-2">
            <StatusBadge variant={phaseBadge(phase)} label={phase.replace(/_/g, ' ')} />
            <PillButton size="sm" variant="secondary" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={fetchStatus}>
              Refresh
            </PillButton>
          </div>
        }
      />
      <div className="space-y-6 p-4 pb-24 sm:p-6 lg:p-8">
        <header>
          <SectionLabel>SoDEX Live Execution</SectionLabel>
          <h1 className="mt-3 font-sora text-2xl font-bold text-white">Execution Console</h1>
          <p className="mt-2 max-w-2xl font-manrope text-sm leading-6 text-text-secondary">
            Review and approve live hedge orders. All execution requires explicit user confirmation.
          </p>
        </header>

        {loading ? (
          <LoadingState messages={['Fetching execution state...']} activeIndex={0} />
        ) : error ? (
          <GlowCard className="border-danger/25 p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
              <div>
                <p className="font-sora text-base font-bold text-white">Execution State Error</p>
                <p className="mt-2 font-manrope text-sm text-text-secondary">{error}</p>
                <PillButton size="sm" className="mt-4" onClick={fetchStatus} icon={<RefreshCw className="h-3.5 w-3.5" />}>Retry</PillButton>
              </div>
            </div>
          </GlowCard>
        ) : (
          <>
            {/* Setup warning banner */}
            {setupWarning && setupWarning.length > 0 && (
              <GlowCard className="border-amber-500/25 p-5">
                <div className="flex items-start gap-4">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                  <div>
                    <p className="font-sora text-sm font-bold text-white">Order Approved — Signed Execution Requires Additional Setup</p>
                    <p className="mt-2 font-manrope text-sm text-text-secondary">
                      The order has been prepared and approved. To route it live to SoDEX testnet, configure the following environment variables:
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {setupWarning.map((v) => (
                        <span key={v} className="rounded-lg bg-amber-500/10 px-2 py-1 font-mono text-xs text-amber-400">{v}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </GlowCard>
            )}

            {/* Order ticket */}
            {order && (
              <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <GlowCard className="p-5">
                  <div className="flex items-center justify-between">
                    <h2 className="font-sora text-base font-bold text-white">Live Hedge Order</h2>
                    <StatusBadge variant={phaseBadge(phase)} label={phase.replace(/_/g, ' ')} />
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-4">
                    {[
                      ['Instrument', order.pair],
                      ['Direction', order.direction.toUpperCase()],
                      ['Leverage', `${order.leverage}x`],
                      ['Notional USD', `$${order.notionalUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
                      ['Est. Price', `$${order.estimatedPrice.toLocaleString()}`],
                      ['Venue', 'SoDEX Testnet'],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
                        <p className="font-manrope text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">{label}</p>
                        <p className="mt-1.5 font-sora text-base font-bold text-white">{value}</p>
                      </div>
                    ))}
                  </div>

                  {state?.orderId && (
                    <div className="mt-4 rounded-xl border border-accent-lime/15 bg-accent-lime-dim p-3">
                      <p className="font-manrope text-xs text-text-muted">SoDEX Order ID</p>
                      <p className="mt-1 font-mono text-sm text-accent-lime">{state.orderId}</p>
                    </div>
                  )}

                  <div className="mt-6 flex flex-wrap gap-3">
                    {phase === 'AWAITING_USER_APPROVAL' && (
                      <>
                        <PillButton
                          loading={approving}
                          disabled={approving}
                          icon={<CheckCircle className="h-4 w-4" />}
                          onClick={handleApprove}
                        >
                          Approve &amp; Submit to SoDEX
                        </PillButton>
                        <PillButton
                          variant="danger"
                          disabled={approving}
                          icon={<XCircle className="h-4 w-4" />}
                          onClick={handleCancel}
                        >
                          Cancel Order
                        </PillButton>
                      </>
                    )}
                    {(phase === 'FILLED' || phase === 'FAILED' || phase === 'CANCELLED' || phase === 'ORDER_PREPARING') && (
                      <PillButton variant="ghost" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={handleReset}>
                        Reset for New Order
                      </PillButton>
                    )}
                  </div>
                </GlowCard>

                <ExecutionTimeline steps={order.timeline} />
              </div>
            )}

            {/* Audit log */}
            {state?.log && state.log.length > 0 && (
              <GlowCard className="p-5">
                <h2 className="font-sora text-base font-bold text-white">Execution Audit Log</h2>
                <div className="mt-4 space-y-2">
                  {[...state.log].reverse().map((entry, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
                      <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-accent-lime/60" />
                      <div>
                        <p className="font-manrope text-xs font-bold text-text-muted">{new Date(entry.timestamp).toLocaleTimeString()} — {entry.phase}</p>
                        <p className="mt-0.5 font-manrope text-sm text-text-secondary">{entry.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </GlowCard>
            )}

            <p className="font-manrope text-xs text-text-muted">
              All live order routing requires your explicit approval. DeltaGuard AI never auto-executes.
            </p>
          </>
        )}
      </div>
    </>
  );
}
