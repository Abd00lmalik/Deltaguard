import { NextRequest, NextResponse } from 'next/server';
import { MOCK_PENDING_ORDER } from '@/lib/mock/orders';
import type { OrderTimelineStep } from '@/types/execution';

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { orderId?: string };

  if (body.orderId !== MOCK_PENDING_ORDER.id) {
    return NextResponse.json({ error: 'Mock order not found.' }, { status: 404 });
  }

  await new Promise((resolve) => setTimeout(resolve, 1500));
  const now = Date.now();
  const timeline: OrderTimelineStep[] = MOCK_PENDING_ORDER.timeline.map((step, index) => ({
    ...step,
    status: 'complete',
    timestamp: step.timestamp ?? new Date(now + index * 800).toISOString(),
    description:
      step.step === 5
        ? 'Submitted to simulated SoDEX order gateway.'
        : step.step === 6
          ? 'Filled at simulated market price with modeled slippage.'
          : step.step === 7
            ? 'Hedge coverage updated in demo state.'
            : step.description
  }));

  return NextResponse.json(
    {
      ...MOCK_PENDING_ORDER,
      status: 'filled',
      venue: 'Simulated SoDEX',
      timeline,
      filledPrice: 63388,
      filledAt: new Date().toISOString()
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
