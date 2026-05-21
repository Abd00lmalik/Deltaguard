// DeltaGuard AI - Execution State Machine Transitions

import type { ExecutionPhase } from '@/lib/storage/execution-store';

const TRANSITIONS: Record<ExecutionPhase, ExecutionPhase[]> = {
  AWAITING_USER_APPROVAL: ['APPROVED', 'CANCELLED'],
  APPROVED: ['ORDER_PREPARING', 'FAILED'],
  ORDER_PREPARING: ['ORDER_SUBMITTED', 'FAILED'],
  ORDER_SUBMITTED: ['FILLED', 'FAILED'],
  FILLED: ['AWAITING_USER_APPROVAL'], // allows reset
  FAILED: ['AWAITING_USER_APPROVAL'], // allows retry
  CANCELLED: ['AWAITING_USER_APPROVAL'] // allows reset
};

export function transitionTo(current: ExecutionPhase, next: ExecutionPhase): boolean {
  const allowed = TRANSITIONS[current] || [];
  return allowed.includes(next);
}
