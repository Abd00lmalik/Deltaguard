import { NextResponse } from 'next/server';
import { getSodexAccountState } from '@/lib/providers/live-provider';
import { getOnChainPortfolio } from '@/lib/wallet/portfolio';
import { getDeFiPositions, type DeFiPosition } from '@/lib/wallet/defi-positions';
import { appendPortfolioSnapshot } from '@/lib/storage/portfolio-history';
import type { PortfolioAsset } from '@/types/portfolio';
import { mainnet, base, optimism, sepolia } from 'viem/chains';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  const chainIdStr = searchParams.get('chainId');

  if (!address) {
    return NextResponse.json(
      {
        error: 'Wallet address required. Connect your Web3 wallet on the Portfolio page.',
        code: 'CONNECTION_REQUIRED',
      },
      { status: 400 }
    );
  }

  const selectedChainId = chainIdStr ? parseInt(chainIdStr, 10) : sepolia.id;
  const headerApiKey = request.headers.get('x-sodex-api-key') || undefined;

  // Determine which chains to query based on selection
  const chainsToQuery = selectedChainId === mainnet.id
    ? [mainnet.id, base.id, optimism.id]
    : [selectedChainId];

  // Fetch portfolio assets and DeFi positions for each chain in parallel
  const fetchPromises = chainsToQuery.map(async (cid) => {
    const assets = await getOnChainPortfolio(address, cid).catch((e) => {
      console.warn(`[DeltaGuard] Failed to fetch on-chain assets for chain ${cid}:`, e);
      return [] as PortfolioAsset[];
    });
    const defi = await getDeFiPositions(address, cid).catch((e) => {
      console.warn(`[DeltaGuard] Failed to fetch DeFi positions for chain ${cid}:`, e);
      return [] as DeFiPosition[];
    });
    return { assets, defi };
  });

  // Concurrently fetch SoDEX account state and on-chain assets
  const [sodexResult, queryResults] = await Promise.allSettled([
    getSodexAccountState(address, { apiKey: headerApiKey }),
    Promise.all(fetchPromises),
  ]);

  const sodexAccountState = sodexResult.status === 'fulfilled' ? sodexResult.value : null;
  const results = queryResults.status === 'fulfilled' ? queryResults.value : [];

  // Merge results across all queried chains
  const assets: PortfolioAsset[] = [];
  const defiPositions: DeFiPosition[] = [];

  for (const res of results) {
    assets.push(...res.assets);
    defiPositions.push(...res.defi);
  }

  if (sodexResult.status === 'rejected') {
    console.warn('[DeltaGuard] SoDEX account state unavailable:', sodexResult.reason);
  }

  // Compute portfolio totals including DeFi positions
  const spotValueUsd = assets.reduce((s, a) => s + (a.valueUsd ?? 0), 0);
  const defiValueUsd = defiPositions.reduce((s, d) => s + (d.valueUsd ?? 0), 0);
  const totalValueUsd = spotValueUsd + defiValueUsd;

  const directional = assets.filter((a) => a.class !== 'stablecoin');
  const totalDir = directional.reduce((s, a) => s + a.valueUsd, 0);
  const weightedDelta = directional.reduce((s, a) => s + a.delta * a.valueUsd, 0);
  const netDelta = totalDir > 0 ? weightedDelta / totalDir : 0;

  // Persist a snapshot for the portfolio history chart (fire-and-forget)
  if (assets.length > 0 || defiPositions.length > 0) {
    void appendPortfolioSnapshot(address, {
      timestamp: new Date().toISOString(),
      valueUsd: totalValueUsd,
      netDelta: Number(netDelta.toFixed(3)),
      assetCount: assets.length + defiPositions.length,
    }).catch((e) => {
      console.warn('[DeltaGuard] Failed to store portfolio snapshot:', e);
    });
  }

  return NextResponse.json({
    sodexAccountState,
    assets,
    defiPositions,
    totalValueUsd,
    netDelta,
    address,
    source: 'on-chain',
    fetchedAt: new Date().toISOString(),
  });
}

export const dynamic = 'force-dynamic';
