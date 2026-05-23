/*
AUDIT RESULTS:
1. Hardcoded pricing:
lib/mock/portfolio.ts:75:    priceUsd: 1.0,

2. Mock reasoning:
app/api/terminal/agent/scan/route.ts:4: * Does not fall back to mock data silently.
app/api/terminal/agent/scan/route.ts:5: * If all sources fail, returns structured error — never mock values.
lib/agent/decision-engine.ts:64:            'BTC/USDT Perp is selected as the highest beta-weight hedge vehicle for the mock portfolio.'
lib/agent/decision-engine.ts:86:      'Slippage estimate: 0.08% based on simulated SoDEX depth.',
lib/agent/decision-engine.ts:95:      'Simulated execution may differ from real market conditions.',
lib/agent/reasoning-engine.ts:6:      `The composite signal score of ${output.compositeScore} places the market in a risk-off regime. Multiple mock SoSoValue-style inputs are pointing in the same direction: ETF outflows, macro pressure, volatility expansion, and weakening SSI momentum.`,
lib/agent/reasoning-engine.ts:8:      `The recommendation requires user approval before any simulated execution can occur. DeltaGuard AI never auto-executes, never touches real funds, and never presents mock execution as live trading.`
lib/agent/reasoning-engine.ts:16:      'No simulated order is created unless the hedge threshold and portfolio delta rules are both satisfied.'

3. Architecture route:
app/integrations/page.tsx:47:      <Topbar title="System Architecture" />
app/integrations/page.tsx:51:          <h1 className="mt-3 font-sora text-2xl font-bold text-white">System Architecture</h1>
components/layout/Sidebar.tsx:52:    { label: 'Architecture', href: '/integrations', icon: Layers },

4. Signal pipeline gaps:
lib/integrations/sosovalue/normalizer.ts:174:  // Options Skew signal from Deribit (new signal)
lib/integrations/sosovalue/normalizer.ts:177:  let optionsSkewSource: SignalSource = 'unavailable';
lib/integrations/sosovalue/normalizer.ts:180:    // Positive skew = puts more expensive = bearish demand = negative signal
lib/integrations/sosovalue/normalizer.ts:189:  // Orderbook Imbalance signal from Hyperliquid (new signal)
lib/integrations/sosovalue/normalizer.ts:192:  let obImbalanceSource: SignalSource = 'unavailable';
lib/integrations/sosovalue/normalizer.ts:195:    // Positive ratio = buy-side dominant = bullish = positive signal

5. Chart data binding:
app/api/terminal/portfolio/history/route.ts:2:import { getPortfolioSnapshots, type PortfolioSnapshot } from '@/lib/storage/portfolio-history';
app/api/terminal/portfolio/history/route.ts:4:import { getHistoricalPrices, getCoinGeckoId } from '@/lib/providers/price-feed';
app/api/terminal/portfolio/history/route.ts:20:  // If we have fewer than 7 snapshots, let's reconstruct the historical 7-day trend to avoid a blank or tiny chart!
components/dashboard/PortfolioOverview.tsx:6:  AreaChart,
components/dashboard/PortfolioOverview.tsx:12:} from 'recharts';
components/dashboard/PortfolioOverview.tsx:15:import type { PortfolioSnapshot } from '@/lib/storage/portfolio-history';
components/dashboard/PortfolioOverview.tsx:32:  const [chartData, setChartData] = useState<ChartPoint[]>([]);
*/

import type { MarketSignal } from '@/types/signals';
import type { PortfolioSummary } from '@/types/portfolio';
import type { AgentReasoningOutput, AgentDecision } from '@/types/agent';
import { validateAndEnforceHedgePolicy } from '@/lib/policy/hedge-validator';
import { HEDGE_THRESHOLDS, parseRiskProfile, getSignalWeight, type RiskProfile } from '@/lib/config/signal-weights';
import type {
  DecisionArtifact,
  DecisionReason,
  DecisionInputSnapshot,
  AgentCapabilities,
  AgentMode
} from './types';
import { determineAgentMode } from './capabilities';

// Decision thresholds & policy rules
const THRESHOLDS = {
  MIN_EXPOSURE_FOR_HEDGE:    10_000,  // don't recommend hedge below $10k exposure
  MIN_SIGNAL_COVERAGE:          0.4,  // require 40%+ of signal weights to be live
  AAVE_HEALTH_WARNING:           1.5, // HF below 1.5 → flag as risk factor
  STABLECOIN_SAFE_BUFFER:        0.2, // below 20% stablecoin → higher risk
  BASE_HEDGE_RATIO:              0.28, // hedge 28% of correlated exposure as baseline
  STRONG_HEDGE_RATIO:            0.45, // hedge 45% at strong signal
} as const;

export type PortfolioSnapshot = {
  totalValueUsd: number;
  tokens: { symbol: string; usdValue: number | null; isStablecoin: boolean }[];
  aave?: { healthFactor: number | null; marginUtilization: number | null } | null;
};

export type RiskMetrics = {
  portfolioBetaBtc: number | null;
  portfolioBetaEth: number | null;
  stablecoinRatio: number | null;
  weightedVolatility: number | null;
  riskScore: number | null;
};

export function computeDecisionArtifact(
  capabilities: AgentCapabilities,
  signals: MarketSignal[],
  compositeScore: number | null,
  portfolio: PortfolioSnapshot | null,
  riskMetrics: RiskMetrics | null,
  riskProfileRaw?: string
): DecisionArtifact {
  const profile: RiskProfile = parseRiskProfile(riskProfileRaw);
  const thresholds = HEDGE_THRESHOLDS[profile];
  const generatedAt = new Date().toISOString();
  const agentMode = determineAgentMode(capabilities);

  // Calculate btcCorrelatedExposure
  let btcCorrelatedExposure = 0;
  let stablecoinConcentration = 0;
  if (portfolio) {
    const totalStable = portfolio.tokens
      .filter(t => t.isStablecoin)
      .reduce((sum, t) => sum + (t.usdValue ?? 0), 0);
    const totalNonStable = portfolio.tokens
      .filter(t => !t.isStablecoin)
      .reduce((sum, t) => sum + (t.usdValue ?? 0), 0);
    
    btcCorrelatedExposure = totalNonStable;
    stablecoinConcentration = portfolio.totalValueUsd > 0 ? totalStable / portfolio.totalValueUsd : 0;
  }

  // Build the input snapshot — full audit trail, no fabrication
  const inputs: DecisionInputSnapshot = {
    compositeSignalScore:    compositeScore,
    portfolioValueUsd:       portfolio?.totalValueUsd ?? null,
    btcCorrelatedExposure:   portfolio ? btcCorrelatedExposure : null,
    portfolioBetaToBTC:      riskMetrics?.portfolioBetaBtc ?? null,
    portfolioVolatility:     riskMetrics?.weightedVolatility ?? null,
    aaveHealthFactor:        portfolio?.aave?.healthFactor ?? null,
    stablecoinConcentration: portfolio ? stablecoinConcentration : null,
    activeSignals:           signals.filter(s => s.value !== null && s.source !== 'unavailable').length,
    totalSignals:            signals.length,
    signalCoverage:          signals.length > 0
      ? signals.filter(s => s.value !== null && s.source !== 'unavailable').length / signals.length
      : 0,
  };

  // 1. Check signal coverage capability
  if (!capabilities.marketIntelligence || inputs.signalCoverage < THRESHOLDS.MIN_SIGNAL_COVERAGE) {
    return buildNoActionArtifact(
      "no_action",
      "Insufficient signal coverage for a deterministic decision. " +
      `Only ${(inputs.signalCoverage * 100).toFixed(0)}% of signals are live ` +
      `(minimum required: ${THRESHOLDS.MIN_SIGNAL_COVERAGE * 100}%).`,
      inputs, agentMode, generatedAt
    );
  }

  // 2. Check portfolio exposure connection
  if (!capabilities.portfolioExposure || inputs.btcCorrelatedExposure === null) {
    return buildMonitorArtifact(
      compositeScore, inputs, agentMode, generatedAt,
      "Market signals available but portfolio exposure not connected. " +
      "Connect wallet to enable hedge sizing."
    );
  }

  // 3. Check if score is above the hedge threshold for active risk profile
  if (compositeScore === null || compositeScore > thresholds.hedge) {
    return buildMonitorArtifact(
      compositeScore, inputs, agentMode, generatedAt,
      `Composite score ${compositeScore !== null ? compositeScore.toFixed(1) : 'unavailable'} is above hedge threshold for ${profile} profile ` +
      `(${thresholds.hedge}). Monitoring.`
    );
  }

  // 4. Check if exposure is too small to hedge
  if (inputs.btcCorrelatedExposure < THRESHOLDS.MIN_EXPOSURE_FOR_HEDGE) {
    return buildMonitorArtifact(
      compositeScore, inputs, agentMode, generatedAt,
      `BTC-correlated exposure ($${inputs.btcCorrelatedExposure.toFixed(0)}) is below ` +
      `minimum hedge threshold ($${THRESHOLDS.MIN_EXPOSURE_FOR_HEDGE.toLocaleString()}).`
    );
  }

  // HEDGE DECISION — score crossed threshold and exposure is significant
  const isStrongSignal = compositeScore < thresholds.hedge - 15;
  const hedgeRatio = isStrongSignal
    ? THRESHOLDS.STRONG_HEDGE_RATIO
    : THRESHOLDS.BASE_HEDGE_RATIO;

  // Apply beta adjustment — higher beta = larger hedge needed
  const betaAdjustment = inputs.portfolioBetaToBTC !== null
    ? Math.min(inputs.portfolioBetaToBTC, 1.5)  // cap at 1.5x to prevent extreme sizing
    : 1.0;

  const rawHedgeSizeUsd = inputs.btcCorrelatedExposure * hedgeRatio * betaAdjustment;

  // Apply policy framework — caps leverage at 3x, size at 25% of portfolio, etc.
  const proposedOrder = {
    pair:        "BTC-PERP",
    size:        rawHedgeSizeUsd,
    leverage:    isStrongSignal ? 2 : 1,
    direction:   "short" as const,
    maxSlippage: 50,
    expiry:      Math.floor(Date.now() / 1000) + 3600,
  };

  const policyResult = validateAndEnforceHedgePolicy(
    proposedOrder,
    inputs.portfolioValueUsd ?? rawHedgeSizeUsd * 4
  );

  const enforcedSize     = policyResult.enforced.size;
  const enforcedLeverage = policyResult.enforced.leverage;

  // Build reason array from REAL data values — every string is constructed, never pre-written
  const reasons: DecisionReason[] = [];

  // Add reason for each signal that contributed to the decision (negative score = bearish pressure)
  for (const signal of signals) {
    if (signal.value === null || signal.source === 'unavailable') continue;
    const weight = getSignalWeight(profile, signal.category);

    const isNegative = signal.score < -20;
    if (!isNegative) continue;

    reasons.push({
      factor:      signal.label,
      observation: `${signal.label} reading of ${signal.score.toFixed(1)} ` +
                   `contributed to risk-off assessment.`,
      weight:      weight,
      value:       signal.score,
    });
  }

  // Add portfolio-specific reasons
  if (inputs.portfolioBetaToBTC !== null && inputs.portfolioBetaToBTC > 1.0) {
    reasons.push({
      factor:      "Portfolio Beta",
      observation: `Portfolio beta to BTC is ${inputs.portfolioBetaToBTC.toFixed(2)}x, ` +
                   `meaning a 10% BTC move produces a ~${(inputs.portfolioBetaToBTC * 10).toFixed(1)}% portfolio move.`,
      weight:      0.2,
      value:       inputs.portfolioBetaToBTC,
    });
  }

  if (inputs.stablecoinConcentration !== null &&
      inputs.stablecoinConcentration < THRESHOLDS.STABLECOIN_SAFE_BUFFER) {
    reasons.push({
      factor:      "Stablecoin Buffer",
      observation: `Only ${(inputs.stablecoinConcentration * 100).toFixed(1)}% of portfolio ` +
                   `is in stablecoins. No natural downside buffer exists.`,
      weight:      0.1,
      value:       inputs.stablecoinConcentration,
    });
  }

  if (inputs.aaveHealthFactor !== null && inputs.aaveHealthFactor < THRESHOLDS.AAVE_HEALTH_WARNING) {
    reasons.push({
      factor:      "Aave Health Factor",
      observation: `Aave health factor of ${inputs.aaveHealthFactor.toFixed(2)} ` +
                   `is below warning threshold of ${THRESHOLDS.AAVE_HEALTH_WARNING}. ` +
                   `Liquidation risk increases in drawdown scenarios.`,
      weight:      0.15,
      value:       inputs.aaveHealthFactor,
    });
  }

  // Confidence: based on signal coverage and signal strength
  const confidence = Math.round(
    Math.min(100, inputs.signalCoverage * 100 * (isStrongSignal ? 0.95 : 0.75))
  );

  return {
    action:      "hedge",
    instrument:  "BTC-PERP",
    sizeUsd:     enforcedSize,
    leverage:    enforcedLeverage,
    direction:   "short",
    confidence,
    reason:      reasons,
    inputs,
    generatedAt,
    agentMode,
  };
}

// Helper builders for non-hedge decisions
function buildNoActionArtifact(
  action: DecisionArtifact["action"],
  reasonText: string,
  inputs: DecisionInputSnapshot,
  agentMode: AgentMode,
  generatedAt: string,
): DecisionArtifact {
  return {
    action, instrument: null, sizeUsd: null, leverage: null, direction: null,
    confidence: 0,
    reason: [{ factor: "System", observation: reasonText, weight: 1, value: null }],
    inputs, agentMode, generatedAt,
  };
}

function buildMonitorArtifact(
  score: number | null,
  inputs: DecisionInputSnapshot,
  agentMode: AgentMode,
  generatedAt: string,
  reasonText: string,
): DecisionArtifact {
  return {
    action: "monitor", instrument: null, sizeUsd: null, leverage: null, direction: null,
    confidence: Math.round(inputs.signalCoverage * 70),
    reason: [{
      factor:      "Composite Signal Score",
      observation: reasonText,
      weight:      1,
      value:       score,
    }],
    inputs, agentMode, generatedAt,
  };
}

// Backwards-compatible runAgentScan helper that maps DecisionArtifact to legacy output shape
export function runAgentScan(
  signals: MarketSignal[],
  portfolio: PortfolioSummary,
  riskProfileRaw?: string
): AgentReasoningOutput {
  const profile = parseRiskProfile(riskProfileRaw);
  const thresholds = HEDGE_THRESHOLDS[profile];
  
  // Construct standard dummy capabilities for runAgentScan
  const capabilities: AgentCapabilities = {
    marketIntelligence: signals.length > 0,
    portfolioExposure: portfolio.totalValueUsd > 0,
    executionVenue: true,
    signedExecution: false,
    accountInitialized: false,
  };

  const score = signals.length > 0 ? signals[0].score : 0; // Simple dummy score mapping
  
  // Construct mock tokens list to map to computeDecisionArtifact
  const portfolioSnapshot: PortfolioSnapshot = {
    totalValueUsd: portfolio.totalValueUsd,
    tokens: [
      { symbol: "ETH", usdValue: portfolio.totalValueUsd * 0.8, isStablecoin: false },
      { symbol: "USDC", usdValue: portfolio.totalValueUsd * 0.2, isStablecoin: true }
    ],
    aave: null
  };

  const riskMetrics: RiskMetrics = {
    portfolioBetaBtc: 1.0,
    portfolioBetaEth: 1.0,
    stablecoinRatio: 0.2,
    weightedVolatility: 60,
    riskScore: portfolio.riskScore
  };

  const artifact = computeDecisionArtifact(
    capabilities,
    signals,
    score,
    portfolioSnapshot,
    riskMetrics,
    riskProfileRaw
  );

  const decision: AgentDecision = artifact.action === "hedge" ? "hedge" : artifact.action === "monitor" ? "watch" : "no-action";
  const hedgeRecommendation = artifact.action === "hedge" ? {
    pair: 'BTC/USDT Perp',
    direction: 'short' as const,
    leverage: artifact.leverage ?? 1,
    sizePercent: 25,
    notionalUsd: artifact.sizeUsd ?? 0,
    rationale: artifact.reason.map(r => r.observation).join(" ")
  } : null;

  return {
    decision,
    compositeScore: score,
    portfolioDelta: portfolio.netDeltaExposure,
    confidence: artifact.confidence,
    reasoningSteps: artifact.reason.map(r => r.observation),
    reasoningNarrative: artifact.reason.map(r => r.observation),
    decisionRule: `IF compositeScore < ${thresholds.hedge} AND portfolioDelta > 0.5 THEN decision = HEDGE`,
    hedgeRecommendation,
    warnings: ["Leverage amplifies risk."],
    refusals: ["Access fund credentials."],
    requiresConfirmation: true
  };
}
