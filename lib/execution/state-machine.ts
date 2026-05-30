// DeltaGuard AI - Execution State Machine Transitions

import type { ExecutionPhase } from '@/lib/storage/execution-store';

const TRANSITIONS: Record<ExecutionPhase, ExecutionPhase[]> = {
  NONE: ['AWAITING_USER_APPROVAL'],
  AWAITING_USER_APPROVAL: ['APPROVED', 'CANCELLED', 'NONE'],
  APPROVED: ['ORDER_PREPARING', 'FAILED', 'NONE'],
  ORDER_PREPARING: ['ORDER_SUBMITTED', 'FAILED', 'NONE'],
  ORDER_SUBMITTED: ['FILLED', 'FAILED', 'NONE', 'PARTIALLY_FILLED', 'CANCELLED', 'REJECTED', 'EXPIRED'],
  FILLED: ['HEDGE_ACTIVE', 'NONE', 'AWAITING_USER_APPROVAL'],
  PARTIALLY_FILLED: ['FILLED', 'CANCELLED', 'FAILED', 'NONE', 'PARTIALLY_FILLED'],
  HEDGE_ACTIVE: ['NONE', 'AWAITING_USER_APPROVAL'],
  FAILED: ['NONE', 'AWAITING_USER_APPROVAL'],
  CANCELLED: ['NONE', 'AWAITING_USER_APPROVAL'],
  REJECTED: ['NONE', 'AWAITING_USER_APPROVAL'],
  EXPIRED: ['NONE', 'AWAITING_USER_APPROVAL']
};

export function transitionTo(current: ExecutionPhase, next: ExecutionPhase): boolean {
  const allowed = TRANSITIONS[current] || [];
  return allowed.includes(next);
}
