# ValueChain Integration - Wave 1 Placeholder

## Current behavior (Wave 1)
The client returns mock status strings. No wallet connection, private key, contract read, or contract write is required.

## Future integration (Wave 3)
- Connect to a ValueChain RPC endpoint
- Read hedge position state from contracts
- Verify settlement and position status on-chain
- Add write operations only after explicit user confirmation and wallet architecture review

## Environment variables required
- `VALUECHAIN_RPC_URL`

## Expected real response shape
```ts
interface ValueChainStatus {
  chainId: number;
  latestBlock: number;
  rpcHealthy: boolean;
}
```

## Integration file
`lib/integrations/valuechain/client.ts`
