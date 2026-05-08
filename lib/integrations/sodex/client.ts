// DeltaGuard AI - SoDEX Execution Integration Client
// Wave 1: Simulates order submission. Wave 2: Replace with real SoDEX API calls.
//
// TODO: Set SODEX_BASE_URL in .env
// TODO: Set SODEX_API_KEY in .env
// TODO: Add orderbook quote API integration
// TODO: Add limit/market order placement
// TODO: Add order status polling and execution confirmation
// TODO: Add robust error handling and cancellation semantics

import type { FilledHedgeOrder, HedgeOrder } from '@/types/execution';
import { submitMockHedgeOrder } from './mock-client';

const BASE_URL = process.env.SODEX_BASE_URL ?? '';
const API_KEY = process.env.SODEX_API_KEY ?? '';
const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';

export async function submitHedgeOrder(order: HedgeOrder): Promise<FilledHedgeOrder> {
  if (DEMO || !BASE_URL || !API_KEY) return submitMockHedgeOrder(order);
  const res = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(order)
  });
  if (!res.ok) throw new Error(`SoDEX API error: ${res.status}`);
  const data = (await res.json()) as unknown;
  return data as FilledHedgeOrder;
}
