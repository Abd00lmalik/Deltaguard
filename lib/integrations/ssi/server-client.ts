/**
 * DeltaGuard AI - SSI Protocol Integration Server Client (Live mode only)
 * 
 * AUDIT FINDINGS:
 * 1. The exact URL being constructed in `lib/integrations/ssi/client.ts` is `${BASE_URL}/portfolio/holdings` (e.g. `https://api.ssi-protocol.io/portfolio/holdings`).
 * 2. `SSI_API_BASE_URL` holds `https://api.ssi-protocol.io` in `.env.example`.
 * 3. It points to a separate SSI endpoint, not SoSoValue.
 * 4. The path is `/portfolio/holdings`.
 * 5. That path does NOT appear in the SoSoValue API docs or whitepaper.
 * 6. To avoid 404 cascading failures, we implement Option C: stop calling the non-functional endpoint,
 *    and instead return a structured setup/unavailable state.
 */

import type { PortfolioAsset } from '@/types/portfolio';

export interface SSIResult {
  available: boolean;
  setupRequired?: boolean;
  source: string;
  walletAddress: string | null;
  message: string;
  assets?: PortfolioAsset[];
}

const _BASE_URL = process.env.SSI_API_BASE_URL ?? '';

export async function fetchSSIData(walletAddress: string | null): Promise<SSIResult> {
  // SSI live data source not yet configured or returning 404.
  // Portfolio exposure requires wallet connection.
  return {
    available: false,
    setupRequired: true,
    source: "unavailable",
    walletAddress,
    message: walletAddress
      ? "SSI exposure source not configured for this address. Verify SSI contract or API source in settings."
      : "Connect a wallet or enter a watch address to load SSI portfolio exposure.",
    assets: []
  };
}

export async function fetchSSIPortfolio(_address?: string): Promise<PortfolioAsset[]> {
  // Graceful fallback: return empty list since SSI endpoint is not functional,
  // preventing 500/404 page explosions.
  return [];
}
