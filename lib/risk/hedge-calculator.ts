export function calculateHedgeNotional(
  portfolioValue: number,
  delta: number,
  hedgePercent: number
): number {
  return Number((portfolioValue * delta * hedgePercent).toFixed(2));
}
