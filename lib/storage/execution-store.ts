// DeltaGuard AI - Execution State Storage Provider
// Supports persistent storage via Vercel KV or in-memory fallback

import type { HedgeOrder } from '@/types/execution';
import { kv } from '@vercel/kv';

export type ExecutionPhase =
  | 'NONE'
  | 'AWAITING_USER_APPROVAL'
  | 'APPROVED'
  | 'ORDER_PREPARING'
  | 'ORDER_SUBMITTED'
  | 'FILLED'
  | 'FAILED'
  | 'CANCELLED'
  | 'PARTIALLY_FILLED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'HEDGE_ACTIVE';

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

const useKV =
  process.env.EXECUTION_STORAGE_PROVIDER === 'kv' &&
  !!process.env.KV_REST_API_URL &&
  !!process.env.KV_REST_API_TOKEN;

if (!useKV) {
  console.warn(
    '[DeltaGuard Storage] KV not configured. Execution state will use in-memory fallback and will not survive server restarts. ' +
    'Set EXECUTION_STORAGE_PROVIDER=kv and configure KV_REST_API_URL/KV_REST_API_TOKEN to enable persistence.'
  );
}

export async function getExecutionState(address?: string | null): Promise<ExecutionState> {
  const suffix = address ? `:${address.toLowerCase()}` : ':global';
  const key = `execution_state${suffix}`;

  if (useKV) {
    try {
      const data = await kv.get<ExecutionState>(key);
      if (data && data.phase) {
        return data;
      }
    } catch (e) {
      console.error('[DeltaGuard Storage] Failed to fetch execution state from Vercel KV:', e);
    }
  }

  const memoryKey = suffix;
  if (!inMemoryStateMap[memoryKey]) {
    inMemoryStateMap[memoryKey] = getInitialState();
  }
  return inMemoryStateMap[memoryKey];
}

export async function setExecutionState(state: ExecutionState, address?: string | null): Promise<void> {
  const suffix = address ? `:${address.toLowerCase()}` : ':global';
  const key = `execution_state${suffix}`;

  if (useKV) {
    try {
      await kv.set(key, state);
      return;
    } catch (e) {
      console.error('[DeltaGuard Storage] Failed to save execution state to Vercel KV:', e);
    }
  }

  inMemoryStateMap[suffix] = state;
}

export async function resetExecutionState(address?: string | null): Promise<void> {
  const suffix = address ? `:${address.toLowerCase()}` : ':global';
  const key = `execution_state${suffix}`;

  if (useKV) {
    try {
      await kv.del(key);
      return;
    } catch (e) {
      console.error('[DeltaGuard Storage] Failed to delete execution state from Vercel KV:', e);
    }
  }

  delete inMemoryStateMap[suffix];
}
