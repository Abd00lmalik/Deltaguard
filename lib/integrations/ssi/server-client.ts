// DeltaGuard AI - SSI Protocol Integration Server Client (Live mode only)

import type { PortfolioAsset } from '@/types/portfolio';

const BASE_URL = process.env.SSI_API_BASE_URL ?? '';

export async function fetchSSIPortfolio(): Promise<PortfolioAsset[]> {
  if (!BASE_URL) {
    throw new Error('SSI exposure unavailable. SSI_API_BASE_URL is not configured.');
  }

  const endpoint = BASE_URL.endsWith('/') ? `${BASE_URL}portfolio/holdings` : `${BASE_URL}/portfolio/holdings`;
  const res = await fetch(endpoint);
  if (!res.ok) {
    throw new Error(`SSI Protocol API error: ${res.status}`);
  }

  const data = await res.json();
  return data as PortfolioAsset[];
}
