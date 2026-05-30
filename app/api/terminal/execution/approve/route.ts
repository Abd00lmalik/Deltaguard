import { NextResponse } from 'next/server';
import { checkLiveReadiness } from '@/lib/config/live-readiness';
import { getExecutionState, setExecutionState, type ExecutionState, type ExecutionPhase } from '@/lib/storage/execution-store';
import { transitionTo } from '@/lib/execution/state-machine';
import { submitOrder, getSodexAccountState } from '@/lib/providers/live-provider';

async function safeTransition(
  address: string,
  nextPhase: ExecutionPhase,
  message: string,
  extraFields: Partial<ExecutionState> = {}
): Promise<ExecutionState> {
  const current = await getExecutionState(address);
  if (current.phase !== nextPhase && !transitionTo(current.phase, nextPhase)) {
    throw new Error(`Invalid state transition from ${current.phase} to ${nextPhase}`);
  }
  const now = new Date().toISOString();
  const nextState: ExecutionState = {
    ...current,
    ...extraFields,
    phase: nextPhase,
    updatedAt: now,
    log: [
      ...current.log,
      {
        phase: nextPhase,
        timestamp: now,
        message
      }
    ]
  };
  await setExecutionState(nextState, address);
  return nextState;
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json(
      { error: 'Wallet address required. Connect your Web3 wallet.' },
      { status: 400 }
    );
  }

  const readiness = checkLiveReadiness();
  const current = await getExecutionState(address);

  if (!current || current.phase !== 'AWAITING_USER_APPROVAL' || !current.hedgeOrder) {
    return NextResponse.json(
      { error: 'No pending approval found, state mismatch, or order is null' },
      { status: 409 }
    );
  }

  // Transition to APPROVED
  try {
    await safeTransition(address, 'APPROVED', 'Order approved by user.');
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Invalid state transition' }, { status: 400 });
  }

  // Move to ORDER_PREPARING
  try {
    await safeTransition(address, 'ORDER_PREPARING', 'Preparing order parameters...');
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Invalid state transition' }, { status: 400 });
  }

  const headerApiKey = request.headers.get('x-sodex-api-key') || undefined;
  const headerApiPrivateKey = request.headers.get('x-sodex-api-private-key') || undefined;

  const hasCustomCredentials = !!headerApiKey && !!headerApiPrivateKey;
  const isReadyForExecution = readiness.sodexSigned || hasCustomCredentials;

  if (!isReadyForExecution) {
    // Stop here — signed execution credentials not available
    const stoppedState = await safeTransition(
      address,
      'ORDER_PREPARING',
      'Order prepared. Signed execution requires SODEX_API_KEY and SODEX_API_PRIVATE_KEY to be configured in Vercel or Settings.'
    );
    return NextResponse.json({
      state: stoppedState,
      executionStopped: true,
      reason: 'SIGNED_EXECUTION_NOT_CONFIGURED',
      message: 'Order has been prepared and approved. Signed testnet execution requires additional setup or user credentials in Settings.',
      setupRequired: ['SODEX_API_KEY', 'SODEX_API_PRIVATE_KEY'],
    });
  }

  // Fetch dynamic SoDEX account state first
  let accountId: number;
  try {
    const sodexState = await getSodexAccountState(address, { apiKey: headerApiKey });
    if (!sodexState) {
      throw new Error('No active SoDEX margin account found.');
    }
    accountId = sodexState.accountId;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'No active SoDEX margin account found';
    const failedState = await safeTransition(
      address,
      'FAILED',
      `Execution failed: ${errMsg}`
    );
    return NextResponse.json({
      state: failedState,
      error: errMsg
    }, { status: 400 });
  }

  // Attempt real SoDEX testnet order
  try {
    const latestState = await getExecutionState(address);
    if (!latestState.hedgeOrder) {
      throw new Error('Hedge order is null');
    }
    const orderResult = await submitOrder(latestState.hedgeOrder, accountId, {
      apiKey: headerApiKey,
      apiPrivateKey: headerApiPrivateKey
    });

    if (!orderResult) {
      const failedState = await safeTransition(
        address,
        'FAILED',
        'SoDEX order submission failed. Check server logs for details.'
      );
      return NextResponse.json({ state: failedState }, { status: 502 });
    }

    const nowStr = new Date().toISOString();
    const isFilled = orderResult.status.toLowerCase() === 'filled';

    const updatedTimeline = latestState.hedgeOrder.timeline.map((step) => {
      if (step.step === 5) {
        return {
          ...step,
          status: 'complete' as const,
          timestamp: nowStr,
          description: `Order successfully routed to SoDEX gateway. ID: ${orderResult.orderId}`
        };
      }
      if (isFilled && (step.step === 6 || step.step === 7)) {
        return {
          ...step,
          status: 'complete' as const,
          timestamp: nowStr,
          description: step.step === 6 ? 'Filled on-chain via SoDEX.' : 'Hedge exposure finalized.'
        };
      }
      return step;
    });

    const submittedState = await safeTransition(
      address,
      'ORDER_SUBMITTED',
      `Order submitted to SoDEX testnet. Order ID: ${orderResult.orderId} (Account ID: ${accountId})`,
      {
        orderId: orderResult.orderId,
        hedgeOrder: {
          ...latestState.hedgeOrder,
          status: isFilled ? 'filled' : 'submitted',
          timeline: updatedTimeline
        }
      }
    );

    if (isFilled) {
      const finalState = await safeTransition(
        address,
        'FILLED',
        'Order filled successfully on SoDEX testnet.'
      );
      return NextResponse.json({ state: finalState });
    }

    return NextResponse.json({ state: submittedState });
  } catch (error) {
    console.error('[DeltaGuard] Live order execution failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const failedState = await safeTransition(
      address,
      'FAILED',
      `Execution failed: ${errorMessage}`
    );
    return NextResponse.json({ state: failedState, error: errorMessage }, { status: 502 });
  }
}
