// DeltaGuard AI - Execution State Machine Transitions

import type { ExecutionPhase } from '@/lib/storage/execution-store';

const TRANSITIONS: Record<ExecutionPhase, ExecutionPhase[]> = {
  NONE: ['AWAITING_USER_APPROVAL'],
  AWAITING_USER_APPROVAL: ['APPROVED', 'CANCELLED', 'NONE'],
  APPROVED: ['ORDER_PREPARING', 'FAILED', 'NONE'],
  ORDER_PREPARING: ['ORDER_SUBMITTED', 'FAILED', 'NONE'],
  ORDER_SUBMITTED: ['FILLED', 'FAILED', 'NONE'],
  FILLED: ['NONE', 'AWAITING_USER_APPROVAL'], // allows reset
  FAILED: ['NONE', 'AWAITING_USER_APPROVAL'], // allows retry
  CANCELLED: ['NONE', 'AWAITING_USER_APPROVAL'] // allows reset
};

export function transitionTo(current: ExecutionPhase, next: ExecutionPhase): boolean {
  const allowed = TRANSITIONS[current] || [];
  return allowed.includes(next);
}
