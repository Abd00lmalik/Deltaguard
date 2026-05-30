import { NextResponse } from 'next/server';
import { getExecutionState, setExecutionState, type ExecutionPhase } from '@/lib/storage/execution-store';
import { getOrderStatus } from '@/lib/providers/live-provider';
import { transitionTo } from '@/lib/execution/state-machine';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    if (!address) {
      return NextResponse.json({ error: 'Address param required' }, { status: 400 });
    }

    const state = await getExecutionState(address);
    
    // Poll real status if order is submitted
    if (state.phase === 'ORDER_SUBMITTED' && state.orderId) {
      const sodexOrder = await getOrderStatus(state.orderId);
      if (sodexOrder) {
        let currentPhase: ExecutionPhase = state.phase;
        const activeState = { ...state };
        const nowStr = new Date().toISOString();

        if (sodexOrder.status === 'filled') {
          // Transition to FILLED
          if (transitionTo(currentPhase, 'FILLED')) {
            activeState.phase = 'FILLED';
            activeState.updatedAt = nowStr;
            activeState.log.push({
              phase: 'FILLED',
              timestamp: nowStr,
              message: `Order ${state.orderId} successfully filled on SoDEX.`
            });
            if (activeState.hedgeOrder) {
              activeState.hedgeOrder.status = 'filled';
              activeState.hedgeOrder.timeline = activeState.hedgeOrder.timeline.map((step) => {
                if (step.step === 6) {
                  return {
                    ...step,
                    status: 'complete' as const,
                    timestamp: nowStr,
                    description: `Order filled on-chain via SoDEX at avg price: $${sodexOrder.avgFillPrice ?? activeState.hedgeOrder?.estimatedPrice}.`
                  };
                }
                return step;
              });
            }
            await setExecutionState(activeState, address);
            currentPhase = 'FILLED';
          }

          // Transition to HEDGE_ACTIVE
          if (transitionTo(currentPhase, 'HEDGE_ACTIVE')) {
            activeState.phase = 'HEDGE_ACTIVE';
            activeState.updatedAt = nowStr;
            activeState.log.push({
              phase: 'HEDGE_ACTIVE',
              timestamp: nowStr,
              message: `Hedge position active and protective boundaries updated.`
            });
            if (activeState.hedgeOrder) {
              activeState.hedgeOrder.timeline = activeState.hedgeOrder.timeline.map((step) => {
                if (step.step === 7) {
                  return {
                    ...step,
                    status: 'complete' as const,
                    timestamp: nowStr,
                    description: 'Hedge exposure finalized and active.'
                  };
                }
                return step;
              });
            }
            await setExecutionState(activeState, address);
          }
        } else if (sodexOrder.status === 'partially_filled') {
          if (transitionTo(currentPhase, 'PARTIALLY_FILLED')) {
            activeState.phase = 'PARTIALLY_FILLED';
            activeState.updatedAt = nowStr;
            activeState.log.push({
              phase: 'PARTIALLY_FILLED',
              timestamp: nowStr,
              message: `Order ${state.orderId} is partially filled (filled: ${sodexOrder.filledQty ?? 0}, remaining: ${sodexOrder.remainingQty ?? 0}).`
            });
            if (activeState.hedgeOrder) {
              activeState.hedgeOrder.status = 'partially-filled';
            }
            await setExecutionState(activeState, address);
          }
        } else if (sodexOrder.status === 'cancelled') {
          if (transitionTo(currentPhase, 'CANCELLED')) {
            activeState.phase = 'CANCELLED';
            activeState.updatedAt = nowStr;
            activeState.log.push({
              phase: 'CANCELLED',
              timestamp: nowStr,
              message: `Order ${state.orderId} was cancelled.`
            });
            if (activeState.hedgeOrder) {
              activeState.hedgeOrder.status = 'cancelled';
            }
            await setExecutionState(activeState, address);
          }
        } else if (sodexOrder.status === 'rejected') {
          if (transitionTo(currentPhase, 'FAILED')) {
            activeState.phase = 'FAILED';
            activeState.updatedAt = nowStr;
            activeState.log.push({
              phase: 'FAILED',
              timestamp: nowStr,
              message: `Order ${state.orderId} was rejected by exchange.`
            });
            if (activeState.hedgeOrder) {
              activeState.hedgeOrder.status = 'failed';
            }
            await setExecutionState(activeState, address);
          }
        } else if (sodexOrder.status === 'expired') {
          if (transitionTo(currentPhase, 'FAILED')) {
            activeState.phase = 'FAILED';
            activeState.updatedAt = nowStr;
            activeState.log.push({
              phase: 'FAILED',
              timestamp: nowStr,
              message: `Order ${state.orderId} expired.`
            });
            if (activeState.hedgeOrder) {
              activeState.hedgeOrder.status = 'failed';
            }
            await setExecutionState(activeState, address);
          }
        }
        
        return NextResponse.json(activeState, { headers: { 'Cache-Control': 'no-store' } });
      }
    }

    return NextResponse.json(state, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch status';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
