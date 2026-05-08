# SoDEX Integration - Wave 1 Placeholder

## Current behavior (Wave 1)
Order submission is simulated. The mock client waits two seconds and returns a filled receipt. No real order is placed.

## Future integration (Wave 2)
- Fetch orderbook quotes and modeled slippage
- Submit limit or market hedge orders to SoDEX
- Poll order status until accepted, filled, cancelled, or failed
- Add execution errors, retries, cancellation, and audit logs

## Environment variables required
- `SODEX_BASE_URL`
- `SODEX_API_KEY`

## Expected real response shape
```ts
interface SoDEXOrderResponse {
  orderId: string;
  status: string;
  filledPrice?: number;
  filledAt?: string;
}
```

## Integration file
`lib/integrations/sodex/client.ts`
