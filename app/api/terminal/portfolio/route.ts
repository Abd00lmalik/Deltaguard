import { NextResponse } from 'next/server';
import { getSodexAccountState } from '@/lib/providers/live-provider';
import { getOnChainPortfolio } from '@/lib/wallet/portfolio';
import { appendPortfolioSnapshot } from '@/lib/storage/portfolio-history';
import type { PortfolioAsset } from '@/types/portfolio';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json(
      {
        error: 'Wallet address required. Connect your Web3 wallet on the Portfolio page.',
        code: 'CONNECTION_REQUIRED',
      },
      { status: 400 }
    );
  }

  const headerApiKey = request.headers.get('x-sodex-api-key') || undefined;

  // Run both fetches in parallel — SoDEX failure must NOT block on-chain assets
  const [sodexResult, assetsResult] = await Promise.allSettled([
    getSodexAccountState(address, { apiKey: headerApiKey }),
    getOnChainPortfolio(address),
  ]);

  const sodexAccountState = sodexResult.status === 'fulfilled' ? sodexResult.value : null;
  const assets: PortfolioAsset[] = assetsResult.status === 'fulfilled' ? assetsResult.value : [];

  if (sodexResult.status === 'rejected') {
    console.warn('[DeltaGuard] SoDEX account state unavailable:', sodexResult.reason);
  }
  if (assetsResult.status === 'rejected') {
    console.warn('[DeltaGuard] On-chain portfolio unavailable:', assetsResult.reason);
  }

  // Compute portfolio totals server-side
  const totalValueUsd = assets.reduce((s, a) => s + (a.valueUsd ?? 0), 0);
  const directional = assets.filter((a) => a.class !== 'stablecoin');
  const totalDir = directional.reduce((s, a) => s + a.valueUsd, 0);
  const weightedDelta = directional.reduce((s, a) => s + a.delta * a.valueUsd, 0);
  const netDelta = totalDir > 0 ? weightedDelta / totalDir : 0;

  // Persist a snapshot for the portfolio history chart (fire-and-forget)
  if (assets.length > 0) {
    void appendPortfolioSnapshot(address, {
      timestamp: new Date().toISOString(),
      valueUsd: totalValueUsd,
      netDelta: Number(netDelta.toFixed(3)),
      assetCount: assets.length,
    }).catch((e) => {
      console.warn('[DeltaGuard] Failed to store portfolio snapshot:', e);
    });
  }

  return NextResponse.json({
    sodexAccountState,
    assets,
    totalValueUsd,
    netDelta,
    address,
    source: 'on-chain',
    fetchedAt: new Date().toISOString(),
  });
}

export const dynamic = 'force-dynamic';
