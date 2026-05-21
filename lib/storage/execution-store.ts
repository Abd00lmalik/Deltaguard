// DeltaGuard AI - Execution State Storage Provider
// Supports persistent storage via Vercel KV or in-memory fallback


import type { HedgeOrder } from '@/types/execution';

export type ExecutionPhase =
  | 'NONE'
  | 'AWAITING_USER_APPROVAL'
  | 'APPROVED'
  | 'ORDER_PREPARING'
  | 'ORDER_SUBMITTED'
  | 'FILLED'
  | 'FAILED'
  | 'CANCELLED';

export interface ExecutionState {
  phase: ExecutionPhase;
  hedgeOrder: HedgeOrder | null;
  orderId?: string;
  updatedAt: string;
  log: Array<{
    phase: ExecutionPhase;
    timestamp: string;
    message: string;
  }>;
}

// In-memory fallback for local development or when Vercel KV is not configured
const inMemoryStateMap: Record<string, ExecutionState> = {};

function getInitialState(): ExecutionState {
  return {
    phase: 'NONE',
    hedgeOrder: null,
    updatedAt: new Date().toISOString(),
    log: []
  };
}

export async function getExecutionState(address?: string | null): Promise<ExecutionState> {
  const suffix = address ? `:${address.toLowerCase()}` : ':global';
  const isKvConfigured =
    process.env.EXECUTION_STORAGE_PROVIDER === 'kv' &&
    !!process.env.KV_REST_API_URL &&
    !!process.env.KV_REST_API_TOKEN;

  if (isKvConfigured) {
    try {
      const url = `${process.env.KV_REST_API_URL}/get/execution_state${suffix}`;
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

  const key = suffix;
  if (!inMemoryStateMap[key]) {
    inMemoryStateMap[key] = getInitialState();
  }
  return inMemoryStateMap[key];
}

export async function setExecutionState(state: ExecutionState, address?: string | null): Promise<void> {
  const suffix = address ? `:${address.toLowerCase()}` : ':global';
  const isKvConfigured =
    process.env.EXECUTION_STORAGE_PROVIDER === 'kv' &&
    !!process.env.KV_REST_API_URL &&
    !!process.env.KV_REST_API_TOKEN;

  if (isKvConfigured) {
    try {
      const url = `${process.env.KV_REST_API_URL}/set/execution_state${suffix}`;
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

  inMemoryStateMap[suffix] = state;
}

export async function resetExecutionState(address?: string | null): Promise<void> {
  const suffix = address ? `:${address.toLowerCase()}` : ':global';
  const isKvConfigured =
    process.env.EXECUTION_STORAGE_PROVIDER === 'kv' &&
    !!process.env.KV_REST_API_URL &&
    !!process.env.KV_REST_API_TOKEN;

  if (isKvConfigured) {
    try {
      const url = `${process.env.KV_REST_API_URL}/del/execution_state${suffix}`;
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

  delete inMemoryStateMap[suffix];
}
