# Wave 2 Live Terminal - Walkthrough of Fixes

We have completed the implementation of Wave 2 features and bug fixes targeting the `/terminal` route, resolving 404 errors, ensuring real health check reporting, and integrating the wallet onboarding and EIP-712 authorization flow.

## Completed Tasks

### 1. Correct Endpoint Routing & Gating
- Resolved routing mismatches for all `/terminal/*` pages.
- Created `/api/terminal/health` to provide real health status reporting for `SoSoValue`, `SSI`, and `SoDEX` based on credentials availability and live API connection checks.
- Modified the status banner (`LiveStatusBar.tsx`) to poll `/api/terminal/health` every 60 seconds.

### 2. SoSoValue API Integration Correctness
- Refactored `lib/integrations/sosovalue/server-client.ts` to query actual documented OpenAPI endpoints:
  - `GET /news` (News Feed)
  - `GET /indices/ssimag7/market-snapshot` (SSI Index snapshot)
  - `GET /currencies/1673723677362319866/market-snapshot` (BTC snapshot)
- Implemented `lib/integrations/sosovalue/normalizer.ts` to process and map the live API responses to DeltaGuard's internal representation of 9 market signals.
- Parameterized the signal components (`CompositeSignalScore.tsx` and `SignalFeed.tsx`) to accept live normalized signals via props, with fallbacks to mock data.

### 3. Portfolio Connection Flow & Address Guarding
- Restructured `/terminal/portfolio` to fetch live holdings from `/api/terminal/portfolio` only when an address is supplied.
- Removed all simulated mock address connection fallbacks from `/terminal`.
- Supported exactly three valid address sources:
  1. Connected EVM wallet address from MetaMask or Rabby browser extension (`window.ethereum`).
  2. User-pasted EVM watch address input field.
  3. `SODEX_ACCOUNT_ADDRESS` environment variable fallback for admin/testing.
- Integrated a premium **SoDEX Margin Account Status** card displaying live balance, leverage, margin ratio, and positions count.
- Added onboarding center actions to **claim 10,000 USDC testnet tokens** from the faucet and to **sign execution authorization payloads** using EIP-712 structured signing.
