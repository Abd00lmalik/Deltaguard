// Mock SSI Protocol client - Wave 1 Demo Mode
import { MOCK_PORTFOLIO_ASSETS, MOCK_PORTFOLIO_SUMMARY } from '@/lib/mock/portfolio';
import type { PortfolioAsset, PortfolioSummary } from '@/types/portfolio';

export function getMockPortfolioHoldings(): PortfolioAsset[] {
  return MOCK_PORTFOLIO_ASSETS;
}

export function getMockPortfolioSummary(): PortfolioSummary {
  return MOCK_PORTFOLIO_SUMMARY;
}
