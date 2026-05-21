import { NextResponse } from 'next/server';
import { getExecutionState, setExecutionState } from '@/lib/storage/execution-store';

export async function POST() {
  try {
    const current = await getExecutionState();
    const nowStr = new Date().toISOString();
    
    const cancelledState = {
      ...current,
      phase: 'CANCELLED' as const,
      updatedAt: nowStr,
      log: [
        ...current.log,
        {
          phase: 'CANCELLED' as const,
          timestamp: nowStr,
          message: 'Order execution cancelled by user.'
        }
      ]
    };
    
    await setExecutionState(cancelledState);
    return NextResponse.json(cancelledState);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to cancel execution' }, { status: 500 });
  }
}
