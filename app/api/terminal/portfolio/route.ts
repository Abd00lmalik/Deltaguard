import { NextResponse } from 'next/server';
import { getSodexAccountState } from '@/lib/providers/live-provider';

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

  try {
    let sodexAccountState = null;
    
    try {
      sodexAccountState = await getSodexAccountState(address);
    } catch (e) {
      console.warn('[DeltaGuard] SoDEX account state unavailable for address:', address, e);
    }

    return NextResponse.json({
      sodexAccountState,
      address,
      source: 'live',
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[DeltaGuard] Failed to fetch SoDEX state:', error);
    const errorMessage = error instanceof Error ? error.message : 'SoDEX fetch failed';
    return NextResponse.json(
      {
        error: errorMessage,
        code: 'SODEX_FETCH_FAILED',
      },
      { status: 502 }
    );
  }
}
export const dynamic = 'force-dynamic';
