// DeltaGuard AI - Execution State Storage Provider
// Supports persistent storage via Vercel KV or in-memory fallback

import { MOCK_PENDING_ORDER } from '@/lib/mock/orders';
import type { HedgeOrder } from '@/types/execution';

export type ExecutionPhase =
  | 'AWAITING_USER_APPROVAL'
  | 'APPROVED'
  | 'ORDER_PREPARING'
  | 'ORDER_SUBMITTED'
  | 'FILLED'
  | 'FAILED'
  | 'CANCELLED';

export interface ExecutionState {
  phase: ExecutionPhase;
  hedgeOrder: HedgeOrder;
  orderId?: string;
  updatedAt: string;
  log: Array<{
    phase: ExecutionPhase;
    timestamp: string;
    message: string;
  }>;
}

// In-memory fallback for local development or when Vercel KV is not configured
let inMemoryState: ExecutionState | null = null;

function getInitialState(): ExecutionState {
  return {
    phase: 'AWAITING_USER_APPROVAL',
    hedgeOrder: MOCK_PENDING_ORDER,
    updatedAt: new Date().toISOString(),
    log: [
      {
        phase: 'AWAITING_USER_APPROVAL',
        timestamp: new Date().toISOString(),
        message: 'Awaiting user confirmation to execute portfolio hedge.'
      }
    ]
  };
}

export async function getExecutionState(): Promise<ExecutionState> {
  const isKvConfigured =
    process.env.EXECUTION_STORAGE_PROVIDER === 'kv' &&
    !!process.env.KV_REST_API_URL &&
    !!process.env.KV_REST_API_TOKEN;

  if (isKvConfigured) {
    try {
      const url = `${process.env.KV_REST_API_URL}/get/execution_state`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`
        },
        cache: 'no-store'
      });
      if (res.ok) {
        const json = await res.json();
        if (json.result) {
          const parsed = JSON.parse(json.result) as ExecutionState;
          // Ensure structure remains valid
          if (parsed && parsed.phase) {
            return parsed;
          }
        }
      }
    } catch (e) {
      console.error('[DeltaGuard] Failed to fetch execution state from Vercel KV:', e);
    }
  }

  if (!inMemoryState) {
    inMemoryState = getInitialState();
  }
  return inMemoryState;
}

export async function setExecutionState(state: ExecutionState): Promise<void> {
  const isKvConfigured =
    process.env.EXECUTION_STORAGE_PROVIDER === 'kv' &&
    !!process.env.KV_REST_API_URL &&
    !!process.env.KV_REST_API_TOKEN;

  if (isKvConfigured) {
    try {
      const url = `${process.env.KV_REST_API_URL}/set/execution_state`;
      await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`
        },
        body: JSON.stringify(state)
      });
      return;
    } catch (e) {
      console.error('[DeltaGuard] Failed to save execution state to Vercel KV:', e);
    }
  }

  inMemoryState = state;
}

export async function resetExecutionState(): Promise<void> {
  const isKvConfigured =
    process.env.EXECUTION_STORAGE_PROVIDER === 'kv' &&
    !!process.env.KV_REST_API_URL &&
    !!process.env.KV_REST_API_TOKEN;

  if (isKvConfigured) {
    try {
      const url = `${process.env.KV_REST_API_URL}/del/execution_state`;
      await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`
        }
      });
    } catch (e) {
      console.error('[DeltaGuard] Failed to delete execution state from Vercel KV:', e);
    }
  }

  inMemoryState = getInitialState();
}
