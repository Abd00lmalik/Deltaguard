import { NextResponse } from 'next/server';
import { resetExecutionState, getExecutionState } from '@/lib/storage/execution-store';

export async function POST() {
  try {
    await resetExecutionState();
    const state = await getExecutionState();
    return NextResponse.json(state);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to reset execution';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
