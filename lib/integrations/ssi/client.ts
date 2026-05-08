// DeltaGuard AI - SSI Protocol Integration Client
// Wave 1: Returns mock portfolio holdings. Wave 2: Replace with real SSI Protocol calls.
//
// TODO: Set SSI_API_BASE_URL in .env
// TODO: Add authentication if required by SSI Protocol
// TODO: Map real index composition data to PortfolioAsset
// TODO: Fetch live NAV per unit and rebalance events

import type { PortfolioAsset, PortfolioSummary } from '@/types/portfolio';
import { getMockPortfolioHoldings, getMockPortfolioSummary } from './mock-client';

const BASE_URL = process.env.SSI_API_BASE_URL ?? '';
const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';

export async function fetchPortfolioHoldings(): Promise<PortfolioAsset[]> {
  if (DEMO || !BASE_URL) return getMockPortfolioHoldings();
  const res = await fetch(`${BASE_URL}/portfolio/holdings`);
  if (!res.ok) throw new Error(`SSI Protocol API error: ${res.status}`);
  const data = (await res.json()) as unknown;
  return data as PortfolioAsset[];
}

export async function fetchPortfolioSummary(): Promise<PortfolioSummary> {
  if (DEMO || !BASE_URL) return getMockPortfolioSummary();
  throw new Error('SSI Protocol summary endpoint not yet mapped.');
}
