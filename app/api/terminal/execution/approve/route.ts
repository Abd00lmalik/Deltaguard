import { NextResponse } from 'next/server';
import { checkLiveReadiness } from '@/lib/config/live-readiness';
import { getExecutionState, setExecutionState } from '@/lib/storage/execution-store';
import { transitionTo } from '@/lib/execution/state-machine';
import { submitOrder, getSodexAccountState } from '@/lib/providers/live-provider';

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
  if (!transitionTo(current.phase, 'APPROVED')) {
    return NextResponse.json({ error: 'Invalid state transition' }, { status: 400 });
  }

  await setExecutionState({ ...current, phase: 'APPROVED', updatedAt: new Date().toISOString() }, address);

  // Move to ORDER_PREPARING
  await setExecutionState({ ...current, phase: 'ORDER_PREPARING', updatedAt: new Date().toISOString() }, address);

  if (!readiness.sodexSigned) {
    // Stop here — signed execution credentials not available
    const stoppedState = {
      ...current,
      phase: 'ORDER_PREPARING' as const,
      updatedAt: new Date().toISOString(),
      log: [
        ...current.log,
        {
          phase: 'ORDER_PREPARING' as const,
          timestamp: new Date().toISOString(),
          message: 'Order prepared. Signed execution requires SODEX_API_KEY and SODEX_API_PRIVATE_KEY to be configured in Vercel.',
        },
      ],
    };
    await setExecutionState(stoppedState, address);
    return NextResponse.json({
      state: stoppedState,
      executionStopped: true,
      reason: 'SIGNED_EXECUTION_NOT_CONFIGURED',
      message: 'Order has been prepared and approved. Signed testnet execution requires additional setup.',
      setupRequired: ['SODEX_API_KEY', 'SODEX_API_PRIVATE_KEY'],
    });
  }

  // Fetch dynamic SoDEX account state first
  let accountId: number;
  try {
    const sodexState = await getSodexAccountState(address);
    if (!sodexState) {
      throw new Error('No active SoDEX margin account found.');
    }
    accountId = sodexState.accountId;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'No active SoDEX margin account found';
    const failedState = {
      ...current,
      phase: 'FAILED' as const,
      updatedAt: new Date().toISOString(),
      log: [
        ...current.log,
        {
          phase: 'FAILED' as const,
          timestamp: new Date().toISOString(),
          message: `Execution failed: ${errMsg}`
        }
      ]
    };
    await setExecutionState(failedState, address);
    return NextResponse.json({
      state: failedState,
      error: errMsg
    }, { status: 400 });
  }

  // Attempt real SoDEX testnet order
  try {
    const orderResult = await submitOrder(current.hedgeOrder, accountId);

    if (!orderResult) {
      const failedState = {
        ...current,
        phase: 'FAILED' as const,
        updatedAt: new Date().toISOString(),
        log: [
          ...current.log,
          {
            phase: 'FAILED' as const,
            timestamp: new Date().toISOString(),
            message: 'SoDEX order submission failed. Check server logs for details.',
          },
        ],
      };
      await setExecutionState(failedState, address);
      return NextResponse.json({ state: failedState }, { status: 502 });
    }

    // Complete the whole timeline
    const nowStr = new Date().toISOString();
    const isFilled = orderResult.status.toLowerCase() === 'filled';
    const finalPhase = isFilled ? ('FILLED' as const) : ('ORDER_SUBMITTED' as const);

    const updatedTimeline = current.hedgeOrder.timeline.map((step) => {
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

    const submittedState = {
      ...current,
      phase: finalPhase,
      orderId: orderResult.orderId,
      updatedAt: nowStr,
      hedgeOrder: {
        ...current.hedgeOrder,
        status: isFilled ? ('filled' as const) : ('submitted' as const),
        timeline: updatedTimeline
      },
      log: [
        ...current.log,
        {
          phase: 'ORDER_SUBMITTED' as const,
          timestamp: nowStr,
          message: `Order submitted to SoDEX testnet. Order ID: ${orderResult.orderId} (Account ID: ${accountId})`,
        },
        ...(isFilled ? [{
          phase: 'FILLED' as const,
          timestamp: nowStr,
          message: 'Order filled successfully on SoDEX testnet.'
        }] : [])
      ],
    };

    await setExecutionState(submittedState, address);
    return NextResponse.json({ state: submittedState });
  } catch (error) {
    console.error('[DeltaGuard] Live order execution failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const failedState = {
      ...current,
      phase: 'FAILED' as const,
      updatedAt: new Date().toISOString(),
      log: [
        ...current.log,
        {
          phase: 'FAILED' as const,
          timestamp: new Date().toISOString(),
          message: `Execution failed: ${errorMessage}`
        }
      ]
    };
    await setExecutionState(failedState, address);
    return NextResponse.json({ state: failedState, error: errorMessage }, { status: 502 });
  }
}
