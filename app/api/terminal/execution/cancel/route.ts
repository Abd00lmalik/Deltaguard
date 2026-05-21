import { NextResponse } from 'next/server';
import { getExecutionState, setExecutionState } from '@/lib/storage/execution-store';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    
    const current = await getExecutionState(address);
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
    
    await setExecutionState(cancelledState, address);
    return NextResponse.json(cancelledState);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to cancel execution';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
