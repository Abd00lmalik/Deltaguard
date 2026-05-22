import { NextResponse } from 'next/server';
import { getSodexAccountState } from '@/lib/providers/live-provider';
import { getOnChainPortfolio } from '@/lib/wallet/portfolio';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // Address must come from the user's connected wallet session (query param).
  // Do NOT fall back to SODEX_ACCOUNT_ADDRESS — this is a multi-user app.
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json(
      {
        error: 'Wallet address required. Connect your Web3 wallet on the Portfolio page.',
        code: 'CONNECTION_REQUIRED',
      },
      { status: 400 }
    );
  }

  // Run both fetches in parallel — SoDEX failure must NOT block on-chain assets
  const [sodexResult, assetsResult] = await Promise.allSettled([
    getSodexAccountState(address),
    getOnChainPortfolio(address),
  ]);

  const sodexAccountState = sodexResult.status === 'fulfilled' ? sodexResult.value : null;
  const assets = assetsResult.status === 'fulfilled' ? assetsResult.value : [];

  if (sodexResult.status === 'rejected') {
    console.warn('[DeltaGuard] SoDEX account state unavailable for address:', address, sodexResult.reason);
  }
  if (assetsResult.status === 'rejected') {
    console.warn('[DeltaGuard] On-chain portfolio unavailable for address:', address, assetsResult.reason);
  }

  return NextResponse.json({
    sodexAccountState,
    assets,
    address,
    source: 'live',
    fetchedAt: new Date().toISOString(),
  });
}

export const dynamic = 'force-dynamic';
