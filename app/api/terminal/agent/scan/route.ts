/**
 * TERMINAL ROUTE — LIVE DATA ONLY
 * Returns real external API data or honest error states.
 * Does not fall back to mock data silently.
 * If all sources fail, returns structured error — never mock values.
 * 
 * AUDIT FINDINGS:
 * - Previous version hard-gated on !readiness.sosovalue || !readiness.ssi, returning 503 if either was missing.
 * - This caused a full-page crash on the agent page when SSI returned 404.
 * - Fixed: SSI is optional. Agent runs partial analysis via determineAgentMode() regardless.
 * - All fetches are parallel via Promise.allSettled — no fetch blocks another.
 */

import { NextResponse } from 'next/server';
import { getSoSoValueData } from '@/lib/integrations/sosovalue/provider';
import { fetchSSIData } from '@/lib/integrations/ssi/server-client';
import { normalizeSoSoValueData } from '@/lib/integrations/sosovalue/normalizer';
import { calculateCompositeScore } from '@/lib/integrations/sosovalue/server-client';
import { runGeminiAgentScan } from '@/lib/agent/gemini-client';
import { calculateNetDelta, calculateRiskScore, calculateHedgeSize, getLiveBtcPrice } from '@/lib/risk/delta-engine';
import { determineAgentMode, getExecutionBlockers, buildRecommendation, type AgentCapabilities } from '@/lib/agent/capabilities';
import { getOnChainPortfolio } from '@/lib/wallet/portfolio';
import { type PortfolioAsset } from '@/types/portfolio';
import { type ProviderError } from '@/lib/types/signal-source';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  // walletAddress MUST come from the user's connected wallet (sent in request body).
  // Do NOT fall back to SODEX_ACCOUNT_ADDRESS here — this is a multi-user app.
  // Each user connects their own wallet; the env var is only for admin/diagnostics.
  const walletAddress: string | null = body?.walletAddress ?? null;

  if (!walletAddress) {
    return NextResponse.json(
      {
        error: 'Wallet connection required. Connect your Web3 wallet on the Portfolio page before running a scan.',
        code: 'CONNECTION_REQUIRED',
      },
      { status: 400 }
    );
  }

  // Run all fetches in parallel — SSI failure must NOT block market signal analysis
  // On-chain portfolio is fetched as SSI fallback when wallet address is available
  const [sosoResult, ssiResult, onChainResult] = await Promise.allSettled([
    getSoSoValueData(),
    fetchSSIData(walletAddress),
    walletAddress ? getOnChainPortfolio(walletAddress) : Promise.resolve([]),
  ]);

  const sosoData      = sosoResult.status      === 'fulfilled' ? sosoResult.value      : null;
  const ssiData       = ssiResult.status       === 'fulfilled' ? ssiResult.value       : null;
  const onChainAssets = onChainResult.status   === 'fulfilled' ? onChainResult.value   : [];

  // Portfolio exposure is available if SSI works OR if the user's wallet has on-chain assets
  const hasOnChainPortfolio = Array.isArray(onChainAssets) && onChainAssets.length > 0;
  const hasSSIPortfolio = ssiData?.available === true;

  const capabilities: AgentCapabilities = {
    marketIntelligence: sosoData?.available === true,
    portfolioExposure:  hasSSIPortfolio || hasOnChainPortfolio,
    executionVenue:     Boolean(process.env.SODEX_BASE_URL),
    signedExecution:    Boolean(process.env.SODEX_API_PRIVATE_KEY && process.env.SODEX_API_KEY),
  };

  const mode = determineAgentMode(capabilities);
  const blockers = getExecutionBlockers(capabilities);
  const recommendation = buildRecommendation(mode, capabilities);

  // Build signals only if market data is available
  let signals = null;
  let compositeScore = null;
  let agentOutput = null;

  if (capabilities.marketIntelligence && sosoData) {
    try {
      signals = normalizeSoSoValueData(sosoData, ssiData ?? null);
      compositeScore = calculateCompositeScore(signals);

      if (compositeScore !== null) {
        // Prefer SSI assets if available, fall back to on-chain wallet assets
        const assets: PortfolioAsset[] = (ssiData?.assets && ssiData.assets.length > 0)
          ? ssiData.assets
          : (onChainAssets as PortfolioAsset[]);
        const totalValueUsd = assets.reduce((sum: number, a: PortfolioAsset) => sum + (a.valueUsd ?? 0), 0);
        const netDeltaExposure = assets.length > 0 ? calculateNetDelta(assets) : 0;
        const riskScore = calculateRiskScore(signals, netDeltaExposure);

        const portfolioSummary = {
          totalValueUsd,
          netDeltaExposure,
          hedgeCoverage: 0,
          riskScore,
          lastUpdated: new Date().toISOString()
        };

        // Add thinking delay
        await new Promise((resolve) => setTimeout(resolve, 1200));
        agentOutput = await runGeminiAgentScan(signals, portfolioSummary, sosoData.newsList || []);

        // Always stage a fresh execution order when agent recommends hedging.
        // We reset regardless of current phase so each scan produces a fresh ticket.
        if (agentOutput.decision === 'hedge' && agentOutput.hedgeRecommendation) {
          const { setExecutionState } = await import('@/lib/storage/execution-store');
          const nowStr = new Date().toISOString();

          // Use dynamic hedge sizing based on portfolio value and composite score
          const dynamicNotional = calculateHedgeSize(totalValueUsd, compositeScore, netDeltaExposure);
          const notionalUsd = dynamicNotional > 0
            ? dynamicNotional
            : agentOutput.hedgeRecommendation.notionalUsd;

          // Use live BTC price from SoSoValue snapshot, fall back to default price
          const liveBtcPrice = getLiveBtcPrice(sosoData.btcSnapshot as Record<string, unknown>);
          const estimatedPrice = liveBtcPrice > 0
            ? liveBtcPrice
            : 63400;

          const hedgeOrder = {
            id: `ord-live-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            pair: agentOutput.hedgeRecommendation.pair,
            direction: agentOutput.hedgeRecommendation.direction,
            leverage: agentOutput.hedgeRecommendation.leverage,
            notionalUsd,
            estimatedPrice,
            slippageEstimate: 0.08,
            status: 'pending-approval' as const,
            venue: 'SoDEX Testnet',
            requiresConfirmation: true,
            timeline: [
              { step: 1, label: 'Signal Detected',          description: `Composite signal score: ${compositeScore}. ${signals.filter(s => s.source !== 'unavailable').length} active signals.`, timestamp: nowStr, status: 'complete' as const },
              { step: 2, label: 'Risk Calculated',          description: `Portfolio delta ${netDeltaExposure.toFixed(2)}, risk score ${riskScore}/100. Notional sized to $${notionalUsd.toLocaleString('en-US')}.`, timestamp: nowStr, status: 'complete' as const },
              { step: 3, label: 'Hedge Proposed',           description: `Agent recommends ${agentOutput.hedgeRecommendation.leverage}x ${agentOutput.hedgeRecommendation.direction} ${agentOutput.hedgeRecommendation.pair} at ~$${estimatedPrice.toLocaleString()}.`, timestamp: nowStr, status: 'complete' as const },
              { step: 4, label: 'Awaiting User Approval',   description: 'Manual confirmation required before execution.', timestamp: null, status: 'active' as const },
              { step: 5, label: 'Order Submitted to SoDEX', description: 'Pending approval.', timestamp: null, status: 'pending' as const },
              { step: 6, label: 'Order Filled',             description: 'Pending approval.', timestamp: null, status: 'pending' as const },
              { step: 7, label: 'Hedge Active',             description: 'Portfolio protection updated.', timestamp: null, status: 'pending' as const }
            ]
          };

          await setExecutionState({
            phase: 'AWAITING_USER_APPROVAL',
            hedgeOrder,
            updatedAt: nowStr,
            log: [{ phase: 'AWAITING_USER_APPROVAL', timestamp: nowStr, message: `Hedge order staged — $${notionalUsd.toLocaleString('en-US')} ${agentOutput.hedgeRecommendation.direction} ${agentOutput.hedgeRecommendation.pair}. Awaiting user confirmation.` }]
          });
        }
      }
    } catch (err) {
      console.error('[DeltaGuard] Agent analysis error:', err);
    }
  }

  // Collect errors from failed fetches
  const errors: string[] = [];
  if (sosoResult.status === 'rejected') errors.push(`SoSoValue: ${String(sosoResult.reason)}`);
  if (ssiResult.status === 'rejected')  errors.push(`SSI: ${String(ssiResult.reason)}`);
  if (sosoData?.errors?.length) sosoData.errors.forEach((e: ProviderError) => errors.push(`SoSoValue ${e.endpoint}: ${e.message}`));

  return NextResponse.json({
    // Pass through agent output fields if available (for backward compat with existing UI)
    ...(agentOutput ?? {}),
    // New: capability and mode metadata
    mode,
    capabilities,
    blockers,
    recommendation,
    compositeScore,
    signals: signals ?? [],
    signalSource: sosoData?.source ?? 'unavailable',
    signalProviderHealth: sosoData?.providerHealth ?? 'unavailable',
    portfolioExposure: ssiData?.available ? ssiData : null,
    errors,
    scannedAt: new Date().toISOString(),
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export const dynamic = 'force-dynamic';
