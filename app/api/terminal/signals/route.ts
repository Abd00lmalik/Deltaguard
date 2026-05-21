import { NextResponse } from 'next/server';
import { checkLiveReadiness } from '@/lib/config/live-readiness';
import { fetchSignals, fetchCompositeScore } from '@/lib/providers/live-provider';

export async function GET() {
  const readiness = checkLiveReadiness();

  if (!readiness.sosovalue) {
    return NextResponse.json(
      {
        error: 'SoSoValue credentials not configured',
        code: 'SOSOVALUE_NOT_CONFIGURED',
        setup: 'Set SOSOVALUE_API_KEY and SOSOVALUE_BASE_URL in your environment.',
      },
      { status: 503 }
    );
  }

  try {
    const signals = await fetchSignals();
    const composite = await fetchCompositeScore();

    if (!signals) {
      return NextResponse.json(
        {
          error: 'SoSoValue API returned no data',
          code: 'SOSOVALUE_FETCH_FAILED',
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      signals,
      composite,
      source: 'live',
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[DeltaGuard] Failed to fetch live SoSoValue signals:', error);
    const errorMessage = error instanceof Error ? error.message : 'SoSoValue fetch failed';
    return NextResponse.json(
      {
        error: errorMessage,
        code: 'SOSOVALUE_FETCH_FAILED',
      },
      { status: 502 }
    );
  }
}
export const dynamic = 'force-dynamic';
