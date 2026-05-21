import { NextResponse } from 'next/server';
import { resetExecutionState, getExecutionState } from '@/lib/storage/execution-store';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    
    await resetExecutionState(address);
    const state = await getExecutionState(address);
    return NextResponse.json(state);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to reset execution';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
