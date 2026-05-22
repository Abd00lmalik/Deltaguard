import { NextResponse } from 'next/server';
import { getPortfolioSnapshots, type PortfolioSnapshot } from '@/lib/storage/portfolio-history';
import { getOnChainPortfolio } from '@/lib/wallet/portfolio';
import { getHistoricalPrices, getCoinGeckoId } from '@/lib/providers/price-feed';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json(
      { error: 'address query param required', snapshots: [] },
      { status: 400 }
    );
  }

  // Get saved real-time snapshots
  const snapshots = await getPortfolioSnapshots(address);

  // If we have fewer than 7 snapshots, let's reconstruct the historical 7-day trend to avoid a blank or tiny chart!
  if (snapshots.length < 7) {
    try {
      const assets = await getOnChainPortfolio(address);
      if (assets && assets.length > 0) {
        // Fetch 7-day price history for each asset
        const assetHistories = await Promise.all(
          assets.map(async (asset) => {
            const geckoId = getCoinGeckoId(asset.symbol);
            if (!geckoId) return { symbol: asset.symbol, amount: asset.amount, delta: asset.delta, prices: [] };
            const prices = await getHistoricalPrices(geckoId, 7);
            return { symbol: asset.symbol, amount: asset.amount, delta: asset.delta, prices };
          })
        );

        // Find the length of the price histories (typically 8 points for 7 days)
        const pricePointsCount = Math.max(...assetHistories.map((h) => h.prices.length), 0);
        if (pricePointsCount > 0) {
          const reconstructedSnapshots: PortfolioSnapshot[] = [];
          
          for (let i = 0; i < pricePointsCount; i++) {
            let totalValueUsd = 0;
            let totalDir = 0;
            let weightedDelta = 0;
            let timestampMs = 0;
            let assetCount = 0;

            for (const history of assetHistories) {
              const point = history.prices[i] || history.prices[history.prices.length - 1];
              if (point) {
                const [ts, price] = point;
                timestampMs = Math.max(timestampMs, ts);
                const assetValue = history.amount * price;
                totalValueUsd += assetValue;
                assetCount++;
                
                if (history.delta > 0) { // Spot/Directional assets
                  totalDir += assetValue;
                  weightedDelta += history.delta * assetValue;
                }
              }
            }

            const netDelta = totalDir > 0 ? weightedDelta / totalDir : 0;
            
            reconstructedSnapshots.push({
              timestamp: new Date(timestampMs).toISOString(),
              valueUsd: totalValueUsd,
              netDelta: Number(netDelta.toFixed(3)),
              assetCount,
            });
          }

          // Combine reconstructed history with any actual real-time snapshots
          // Filter out reconstructed snapshots that overlap in time with existing real-time snapshots
          if (snapshots.length > 0) {
            const firstSnapshotTime = new Date(snapshots[0].timestamp).getTime();
            const filteredReconstructed = reconstructedSnapshots.filter(
              (r) => new Date(r.timestamp).getTime() < firstSnapshotTime - 60000 // at least 1 min gap
            );
            return NextResponse.json({
              address,
              snapshots: [...filteredReconstructed, ...snapshots],
              count: filteredReconstructed.length + snapshots.length,
              reconstructed: true,
              fetchedAt: new Date().toISOString(),
            });
          }

          return NextResponse.json({
            address,
            snapshots: reconstructedSnapshots,
            count: reconstructedSnapshots.length,
            reconstructed: true,
            fetchedAt: new Date().toISOString(),
          });
        }
      }
    } catch (err) {
      console.warn('[DeltaGuard] Failed to reconstruct 7-day history:', err);
    }
  }

  return NextResponse.json({
    address,
    snapshots,
    count: snapshots.length,
    fetchedAt: new Date().toISOString(),
  });
}

export const dynamic = 'force-dynamic';
