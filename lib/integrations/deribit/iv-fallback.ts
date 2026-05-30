import { getHistoricalPrices, getCoinGeckoId } from '@/lib/providers/price-feed';

/**
 * Calculates historical realized volatility (annualized standard deviation of daily log returns)
 * over a given number of days.
 * Annualized volatility = Standard Deviation of daily log returns * Math.sqrt(365) * 100
 */
export async function getRealizedVolatilityFallback(currency: 'BTC' | 'ETH', days: number = 7): Promise<number> {
  const geckoId = getCoinGeckoId(currency);
  if (!geckoId) {
    return currency === 'BTC' ? 50.0 : 55.0; // static default fallback
  }

  try {
    const prices = await getHistoricalPrices(geckoId, days);
    if (!prices || prices.length < 3) {
      return currency === 'BTC' ? 50.0 : 55.0;
    }

    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      const p1 = prices[i - 1][1];
      const p2 = prices[i][1];
      if (p1 > 0 && p2 > 0) {
        returns.push(Math.log(p2 / p1));
      }
    }

    if (returns.length < 2) {
      return currency === 'BTC' ? 50.0 : 55.0;
    }

    const mean = returns.reduce((sum, val) => sum + val, 0) / returns.length;
    const variance = returns.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (returns.length - 1);
    const dailyStdDev = Math.sqrt(variance);
    const annualizedVol = dailyStdDev * Math.sqrt(365) * 100; // in percentage points

    return Number(annualizedVol.toFixed(2));
  } catch (err) {
    console.warn(`[DeltaGuard] Failed to calculate realized volatility fallback for ${currency}:`, err);
    return currency === 'BTC' ? 50.0 : 55.0;
  }
}
