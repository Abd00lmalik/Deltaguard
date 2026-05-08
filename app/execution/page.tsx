'use client';

import { useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { ExecutionTimeline } from '@/components/execution/ExecutionTimeline';
import { OrderTicket } from '@/components/execution/OrderTicket';
import { SimulatedReceipt } from '@/components/execution/SimulatedReceipt';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { MOCK_PENDING_ORDER } from '@/lib/mock/orders';
import type { FilledHedgeOrder, OrderTimelineStep } from '@/types/execution';

type ExecutionState = 'pending' | 'executing' | 'complete';

function setStepState(steps: OrderTimelineStep[], completeStep: number, activeStep?: number): OrderTimelineStep[] {
  return steps.map((step) => {
    if (step.step <= completeStep) {
      return {
        ...step,
        status: 'complete',
        timestamp: step.timestamp ?? new Date().toISOString()
      };
    }
    if (step.step === activeStep) return { ...step, status: 'active' };
    return { ...step, status: 'pending' };
  });
}

export default function ExecutionPage() {
  const [executionState, setExecutionState] = useState<ExecutionState>('pending');
  const [timelineSteps, setTimelineSteps] = useState<OrderTimelineStep[]>(MOCK_PENDING_ORDER.timeline);
  const [filledOrder, setFilledOrder] = useState<null | { filledPrice: number; filledAt: string }>(null);

  function handleApprove() {
    if (executionState !== 'pending') return;
    setExecutionState('executing');

    const responsePromise = fetch('/api/mock/execution', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: MOCK_PENDING_ORDER.id })
    }).then(async (response) => (await response.json()) as FilledHedgeOrder);

    setTimelineSteps((steps) => setStepState(steps, 4, 5));
    window.setTimeout(() => setTimelineSteps((steps) => setStepState(steps, 5, 6)), 800);
    window.setTimeout(() => setTimelineSteps((steps) => setStepState(steps, 6, 7)), 1600);
    window.setTimeout(async () => {
      const data = await responsePromise;
      setTimelineSteps(data.timeline);
      setFilledOrder({ filledPrice: data.filledPrice, filledAt: data.filledAt });
      localStorage.setItem('dg-hedge-active', 'true');
      setExecutionState('complete');
    }, 2400);
  }

  return (
    <>
      <Topbar title="Execution" action={<StatusBadge variant="muted" label="SoDEX Execution" />} />
      <div className="space-y-6 p-4 pb-24 sm:p-6 lg:p-8">
        <header>
          <SectionLabel>SoDEX Execution</SectionLabel>
          <h1 className="mt-3 font-sora text-2xl font-bold text-white">Execution</h1>
          <p className="mt-2 max-w-2xl font-manrope text-sm leading-6 text-text-secondary">
            Review the pending hedge ticket, explicitly approve it, and watch the execution timeline complete.
          </p>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div>
            <OrderTicket
              executing={executionState === 'executing'}
              complete={executionState === 'complete'}
              onApprove={handleApprove}
            />
            {filledOrder ? <SimulatedReceipt filledPrice={filledOrder.filledPrice} filledAt={filledOrder.filledAt} /> : null}
          </div>
          <ExecutionTimeline steps={timelineSteps} />
        </div>

        <p className="font-manrope text-xs text-text-muted">Order routing requires your explicit approval.</p>
      </div>
    </>
  );
}
