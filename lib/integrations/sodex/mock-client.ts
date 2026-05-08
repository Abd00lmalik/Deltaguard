// Mock SoDEX client - Wave 1 Demo Mode
import type { FilledHedgeOrder, HedgeOrder } from '@/types/execution';

export async function submitMockHedgeOrder(order: HedgeOrder): Promise<FilledHedgeOrder> {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  const now = new Date().toISOString();
  return {
    ...order,
    status: 'filled',
    filledPrice: 63388,
    filledAt: now,
    timeline: order.timeline.map((step) => ({
      ...step,
      status: 'complete',
      timestamp: step.timestamp ?? now
    }))
  };
}
