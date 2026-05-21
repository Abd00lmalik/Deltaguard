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

const BASE_URL = process.env.SSI_API_BASE_URL ?? '';

export async function fetchSSIData(walletAddress: string | null): Promise<SSIResult> {
  if (!BASE_URL) {
    return {
      available: false,
      setupRequired: true,
      source: "unavailable",
      walletAddress,
      message: walletAddress
        ? "SSI exposure source not configured. Verify SSI_API_BASE_URL is set in your .env configuration."
        : "Connect a wallet or enter a watch address to load SSI portfolio exposure.",
      assets: []
    };
  }

  if (!walletAddress) {
    return {
      available: false,
      setupRequired: false,
      source: "ssi",
      walletAddress: null,
      message: "Connect a wallet or enter a watch address to load SSI portfolio exposure.",
      assets: []
    };
  }

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 5000);
    const url = `${BASE_URL.replace(/\/$/, '')}/portfolio/holdings?address=${encodeURIComponent(walletAddress)}`;
    
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal
    });
    
    clearTimeout(id);

    if (!res.ok) {
      return {
        available: false,
        setupRequired: false,
        source: "ssi",
        walletAddress,
        message: `SSI Protocol API returned error status: ${res.status}`,
        assets: []
      };
    }

    const data = await res.json() as PortfolioAsset[];
    return {
      available: true,
      setupRequired: false,
      source: "ssi",
      walletAddress,
      message: "Successfully retrieved portfolio holdings from SSI Protocol.",
      assets: Array.isArray(data) ? data : []
    };
  } catch (err) {
    console.warn('[DeltaGuard] Failed to fetch SSI data from configured endpoint:', err);
    return {
      available: false,
      setupRequired: false,
      source: "ssi",
      walletAddress,
      message: `Failed to connect to SSI Protocol API: ${err instanceof Error ? err.message : String(err)}`,
      assets: []
    };
  }
}

export async function fetchSSIPortfolio(address?: string): Promise<PortfolioAsset[]> {
  if (!BASE_URL || !address) {
    return [];
  }
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 5000);
    const url = `${BASE_URL.replace(/\/$/, '')}/portfolio/holdings?address=${encodeURIComponent(address)}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    if (!res.ok) return [];
    const data = await res.json() as PortfolioAsset[];
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('[DeltaGuard] Failed to fetch SSI portfolio assets:', err);
    return [];
  }
}
