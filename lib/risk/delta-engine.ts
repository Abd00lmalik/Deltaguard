import type { PortfolioAsset } from '@/types/portfolio';
import type { MarketSignal } from '@/types/signals';
import { clamp } from '@/lib/utils/format';

export function calculateNetDelta(assets: PortfolioAsset[]): number {
  const directionalAssets = assets.filter((asset) => asset.class !== 'stablecoin');
  const totalValue = directionalAssets.reduce((sum, asset) => sum + asset.valueUsd, 0);
  if (totalValue === 0) return 0;

  const weightedDelta = directionalAssets.reduce((sum, asset) => {
    return sum + asset.delta * asset.valueUsd;
  }, 0);

  return Number((weightedDelta / totalValue).toFixed(2));
}

export function calculateRiskScore(signals: MarketSignal[], delta: number): number {
  if (signals.length === 0) return Math.round(delta * 50);
  const negativePressure = signals.reduce((sum, signal) => {
    return sum + Math.max(0, -signal.score) * (signal.confidence / 100);
  }, 0);
  const signalPressure = negativePressure / signals.length;
  return Math.round(clamp(signalPressure * 0.75 + delta * 35, 0, 100));
}
