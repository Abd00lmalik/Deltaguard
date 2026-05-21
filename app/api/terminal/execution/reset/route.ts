import { NextResponse } from 'next/server';
import { resetExecutionState, getExecutionState } from '@/lib/storage/execution-store';

export async function POST() {
  try {
    await resetExecutionState();
    const state = await getExecutionState();
    return NextResponse.json(state);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to reset execution' }, { status: 500 });
  }
}
