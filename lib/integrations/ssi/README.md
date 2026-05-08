# SSI Protocol Integration - Wave 1 Placeholder

## Current behavior (Wave 1)
All calls return mock holdings from `lib/mock/portfolio.ts`. The SSI index names are illustrative.

## Future integration (Wave 2)
- Fetch real SSI Protocol index compositions
- Fetch NAV per unit, rebalance history, and index weights
- Map real portfolio/index fields to internal `PortfolioAsset`
- Add authentication if the production endpoint requires it

## Environment variables required
- `SSI_API_BASE_URL`

## Expected real response shape
```ts
interface SSIIndexCompositionResponse {
  indexSymbol: string;
  navUsd: number;
  holdings: unknown[];
  rebalancedAt: string;
}
```

## Integration file
`lib/integrations/ssi/client.ts`
