import { NextResponse } from 'next/server';
import { checkLiveReadiness } from '@/lib/config/live-readiness';
import { portfolioAssets } from '@/lib/providers/live-provider';

export async function GET() {
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
    const assets = await portfolioAssets();

    return NextResponse.json({
      assets,
      source: 'live',
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[DeltaGuard] Failed to fetch live SSI portfolio:', error);
    return NextResponse.json(
      {
        error: error.message || 'SSI fetch failed',
        code: 'SSI_FETCH_FAILED',
      },
      { status: 502 }
    );
  }
}
export const dynamic = 'force-dynamic';
