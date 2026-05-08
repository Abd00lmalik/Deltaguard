import { NextResponse } from 'next/server';
import { MOCK_COMPOSITE_SCORE, MOCK_SIGNALS } from '@/lib/mock/signals';

export async function GET() {
  await new Promise((resolve) => setTimeout(resolve, 400));
  return NextResponse.json(
    { signals: MOCK_SIGNALS, composite: MOCK_COMPOSITE_SCORE },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
