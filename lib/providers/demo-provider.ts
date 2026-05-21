// Demo mode data provider
// Always imports from mock clients
// Never imports from real server clients
// This file must never import from lib/integrations/sosovalue/server-client
// This file must never import from lib/integrations/sodex/server-client

export { getMockSignals as fetchSignals } from '@/lib/integrations/sosovalue/mock-client';
export { getMockCompositeScore as fetchCompositeScore } from '@/lib/integrations/sosovalue/mock-client';
export { MOCK_PORTFOLIO_ASSETS as portfolioAssets } from '@/lib/mock/portfolio';
export { MOCK_PORTFOLIO_SUMMARY as portfolioSummary } from '@/lib/mock/portfolio';
export { MOCK_PENDING_ORDER as pendingOrder } from '@/lib/mock/orders';

// Simulated execution — always succeeds after 1.5s delay
export async function submitOrder(order: unknown): Promise<{ orderId: string; status: string }> {
  await new Promise((r) => setTimeout(r, 1500));
  return {
    orderId: `DEMO-${Date.now()}`,
    status: 'FILLED',
  };
}
