import { NextResponse } from 'next/server';
import { runAgentScan } from '@/lib/agent/decision-engine';
import { fetchSignals, portfolioAssets } from '@/lib/providers/live-provider';
import { calculateNetDelta, calculateRiskScore } from '@/lib/risk/delta-engine';
import { checkLiveReadiness } from '@/lib/config/live-readiness';

export async function POST() {
  const readiness = checkLiveReadiness();

  if (!readiness.sosovalue || !readiness.ssi) {
    return NextResponse.json(
      {
        error: 'Required live services are not configured.',
        code: 'SERVICES_NOT_CONFIGURED',
        setup: 'Make sure SOSOVALUE_API_KEY, SOSOVALUE_BASE_URL, and SSI_API_BASE_URL are set.',
      },
      { status: 503 }
    );
  }

  try {
    const signals = await fetchSignals();
    const assets = await portfolioAssets();

    const totalValueUsd = assets.reduce((sum, asset) => sum + asset.valueUsd, 0);
    const netDeltaExposure = calculateNetDelta(assets);
    const riskScore = calculateRiskScore(signals, netDeltaExposure);

    const portfolioSummary = {
      totalValueUsd,
      netDeltaExposure,
      hedgeCoverage: 0,
      riskScore,
      lastUpdated: new Date().toISOString()
    };

    // Mimic scanning/thinking delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const output = runAgentScan(signals, portfolioSummary);

    // Seed or update the live execution state if a hedge is recommended
    if (output.decision === 'hedge' && output.hedgeRecommendation) {
      const { getExecutionState, setExecutionState } = await import('@/lib/storage/execution-store');
      const current = await getExecutionState();

      // Only update if we are not currently executing or already filled
      if (current.phase === 'AWAITING_USER_APPROVAL') {
        const nowStr = new Date().toISOString();
        const updatedOrder = {
          id: `ord-live-${Math.random().toString(36).substring(2, 9)}`,
          pair: output.hedgeRecommendation.pair,
          direction: output.hedgeRecommendation.direction,
          leverage: output.hedgeRecommendation.leverage,
          notionalUsd: output.hedgeRecommendation.notionalUsd,
          estimatedPrice: 63400, // BTC/USDT Perp base price
          slippageEstimate: 0.08,
          status: 'pending-approval' as const,
          venue: 'SoDEX Testnet',
          requiresConfirmation: true,
          timeline: [
            {
              step: 1,
              label: 'Signal Detected',
              description: `Composite signal score dropped below -50 threshold (Score: ${output.compositeScore}).`,
              timestamp: nowStr,
              status: 'complete' as const
            },
            {
              step: 2,
              label: 'Risk Calculated',
              description: `Portfolio delta ${netDeltaExposure.toFixed(2)} with net long exposure $${totalValueUsd.toLocaleString('en-US')}.`,
              timestamp: nowStr,
              status: 'complete' as const
            },
            {
              step: 3,
              label: 'Hedge Proposed',
              description: `Agent recommends 2x short BTC/USDT sized to 35% net exposure.`,
              timestamp: nowStr,
              status: 'complete' as const
            },
            {
              step: 4,
              label: 'Awaiting User Approval',
              description: 'Manual confirmation required before execution.',
              timestamp: null,
              status: 'active' as const
            },
            {
              step: 5,
              label: 'Order Submitted to SoDEX',
              description: 'Pending approval.',
              timestamp: null,
              status: 'pending' as const
            },
            {
              step: 6,
              label: 'Order Filled',
              description: 'Pending approval.',
              timestamp: null,
              status: 'pending' as const
            },
            {
              step: 7,
              label: 'Hedge Active',
              description: 'Portfolio protection updated.',
              timestamp: null,
              status: 'pending' as const
            }
          ]
        };

        await setExecutionState({
          phase: 'AWAITING_USER_APPROVAL',
          hedgeOrder: updatedOrder,
          updatedAt: nowStr,
          log: [
            {
              phase: 'AWAITING_USER_APPROVAL',
              timestamp: nowStr,
              message: 'Awaiting user confirmation to execute portfolio hedge.'
            }
          ]
        });
      }
    }

    return NextResponse.json(output, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    console.error('[DeltaGuard] Agent scan failed:', error);
    return NextResponse.json(
      {
        error: error.message || 'Agent scan failed',
        code: 'SCAN_FAILED',
      },
      { status: 502 }
    );
  }
}
export const dynamic = 'force-dynamic';
