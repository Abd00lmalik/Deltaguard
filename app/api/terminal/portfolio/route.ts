import { NextResponse } from 'next/server';
import { checkLiveReadiness } from '@/lib/config/live-readiness';
import { portfolioAssets, getSodexAccountState } from '@/lib/providers/live-provider';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const queryAddress = searchParams.get('address');
  const envAddress = process.env.SODEX_ACCOUNT_ADDRESS;
  const address = queryAddress || envAddress;

  if (!address) {
    return NextResponse.json(
      {
        error: 'Wallet connection, user-pasted watch address, or SODEX_ACCOUNT_ADDRESS environment fallback required.',
        code: 'CONNECTION_REQUIRED',
      },
      { status: 400 }
    );
  }

  const readiness = checkLiveReadiness();

  if (!readiness.ssi) {
    return NextResponse.json(
      {
        error: 'SSI exposure unavailable',
        code: 'SSI_NOT_CONFIGURED',
        setup: 'Set SSI_API_BASE_URL in your environment.',
      },
      { status: 503 }
    );
  }

  try {
    const assets = await portfolioAssets(address);
    let sodexAccountState = null;
    
    try {
      sodexAccountState = await getSodexAccountState(address);
    } catch (e) {
      console.warn('[DeltaGuard] SoDEX account state unavailable for address:', address, e);
    }

    return NextResponse.json({
      assets,
      sodexAccountState,
      address,
      source: 'live',
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[DeltaGuard] Failed to fetch live SSI portfolio:', error);
    const errorMessage = error instanceof Error ? error.message : 'SSI fetch failed';
    return NextResponse.json(
      {
        error: errorMessage,
        code: 'SSI_FETCH_FAILED',
      },
      { status: 502 }
    );
  }
}
export const dynamic = 'force-dynamic';
