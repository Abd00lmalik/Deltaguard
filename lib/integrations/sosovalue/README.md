# SoSoValue Integration - Wave 1 Placeholder

## Current behavior (Wave 1)
All calls return mock data from `lib/mock/signals.ts`.

## Future integration (Wave 2)
- Connect to SoSoValue Terminal API
- Fetch real ETF flow signals, macro pressure, volatility data, and market context
- Map response schema to internal `MarketSignal` type in `types.ts`
- Add API key authentication, rate limiting, and backoff

## Environment variables required
- `SOSOVALUE_BASE_URL`
- `SOSOVALUE_API_KEY`

## Expected real response shape
```ts
interface SoSoValueSignalResponse {
  signals: unknown[];
  generatedAt: string;
}
```

## Integration file
`lib/integrations/sosovalue/client.ts`
