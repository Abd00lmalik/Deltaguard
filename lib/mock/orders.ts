import type { HedgeOrder } from '@/types/execution';

export const MOCK_PENDING_ORDER: HedgeOrder = {
  id: 'ord-dg-001',
  pair: 'BTC/USDT Perp',
  direction: 'short',
  leverage: 2,
  notionalUsd: 35539.14,
  estimatedPrice: 63400,
  slippageEstimate: 0.08,
  status: 'pending-approval',
  venue: 'Simulated SoDEX',
  requiresConfirmation: true,
  timeline: [
    {
      step: 1,
      label: 'Signal Detected',
      description: 'Composite signal score dropped below -50 threshold.',
      timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
      status: 'complete'
    },
    {
      step: 2,
      label: 'Risk Calculated',
      description: 'Portfolio delta 0.81 with net long exposure $101,857.',
      timestamp: new Date(Date.now() - 4 * 60000).toISOString(),
      status: 'complete'
    },
    {
      step: 3,
      label: 'Hedge Proposed',
      description: 'Agent recommends 2x short BTC/USDT sized to 35% net exposure.',
      timestamp: new Date(Date.now() - 3 * 60000).toISOString(),
      status: 'complete'
    },
    {
      step: 4,
      label: 'Awaiting User Approval',
      description: 'Manual confirmation required before execution.',
      timestamp: null,
      status: 'active'
    },
    {
      step: 5,
      label: 'Order Submitted to SoDEX',
      description: 'Pending approval.',
      timestamp: null,
      status: 'pending'
    },
    {
      step: 6,
      label: 'Order Filled',
      description: 'Pending approval.',
      timestamp: null,
      status: 'pending'
    },
    {
      step: 7,
      label: 'Hedge Active',
      description: 'Portfolio protection updated.',
      timestamp: null,
      status: 'pending'
    }
  ]
};
