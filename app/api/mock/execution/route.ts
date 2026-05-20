import { NextRequest, NextResponse } from 'next/server';
import { MOCK_PENDING_ORDER } from '@/lib/mock/orders';
import type { OrderTimelineStep, HedgeOrder } from '@/types/execution';
import { submitHedgeOrder } from '@/lib/integrations/sodex/client';

const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { orderId?: string; order?: HedgeOrder };

  let orderToSubmit: HedgeOrder;
  if (body.order) {
    orderToSubmit = body.order;
  } else if (body.orderId === MOCK_PENDING_ORDER.id) {
    orderToSubmit = MOCK_PENDING_ORDER;
  } else {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  }

  if (DEMO) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const now = Date.now();
    const timeline: OrderTimelineStep[] = orderToSubmit.timeline.map((step, index) => ({
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
        ...orderToSubmit,
        status: 'filled',
        venue: 'Simulated SoDEX',
        timeline,
        filledPrice: 63388,
        filledAt: new Date().toISOString()
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } else {
    try {
      const filledOrder = await submitHedgeOrder(orderToSubmit);
      return NextResponse.json(filledOrder, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      const err = error as Error;
      console.error('Failed to submit order to SoDEX:', err);
      return NextResponse.json({ error: err.message || 'SoDEX submission failed' }, { status: 500 });
    }
  }
}

