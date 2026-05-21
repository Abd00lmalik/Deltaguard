// Live mode data provider
// Server-side only — never import in client components
// Only imports from real server clients
// This file must never import from lib/mock/
// This file must never import from mock-client files

export {
  fetchMarketSignals as fetchSignals,
  fetchCompositeScore,
} from '@/lib/integrations/sosovalue/server-client';

export {
  fetchSSIPortfolio as portfolioAssets,
} from '@/lib/integrations/ssi/server-client';

export {
  placeOrder as submitOrder,
  getOrderStatus,
  cancelOrder,
} from '@/lib/integrations/sodex/server-client';
