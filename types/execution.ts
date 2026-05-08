export type OrderStatus =
  | 'pending-approval'
  | 'approved'
  | 'submitted'
  | 'accepted'
  | 'filled'
  | 'cancelled';

export interface OrderTimelineStep {
  step: number;
  label: string;
  description: string;
  timestamp: string | null;
  status: 'pending' | 'active' | 'complete';
}

export interface HedgeOrder {
  id: string;
  pair: string;
  direction: 'short' | 'long';
  leverage: number;
  notionalUsd: number;
  estimatedPrice: number;
  slippageEstimate: number;
  status: OrderStatus;
  venue: string;
  requiresConfirmation: boolean;
  timeline: OrderTimelineStep[];
}

export interface FilledHedgeOrder extends HedgeOrder {
  filledPrice: number;
  filledAt: string;
}
