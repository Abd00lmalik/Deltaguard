import { NextResponse } from 'next/server';
import { getExecutionState } from '@/lib/storage/execution-store';

export async function GET() {
  try {
    const state = await getExecutionState();
    return NextResponse.json(state, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch status' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
