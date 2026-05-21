import { NextResponse } from 'next/server';
import { getExecutionState } from '@/lib/storage/execution-store';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const state = await getExecutionState(address);
    return NextResponse.json(state, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch status';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
