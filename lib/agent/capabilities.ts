/**
 * DeltaGuard AI - Agent Capability Model
 * Defines what the agent can do based on which live data sources are available.
 * Used by scan route to build partial analysis when SSI or SoSoValue are offline.
 */

export type AgentCapabilities = {
  marketIntelligence: boolean;  // SoSoValue signals available
  portfolioExposure: boolean;   // SSI data available for this address
  executionVenue: boolean;      // SoDEX public market data available
  signedExecution: boolean;     // SoDEX signed credentials + account initialized
};

export type AgentMode =
  | "full"                  // All four capabilities present
  | "market_intelligence"   // SoSoValue only — signals, no hedge sizing
  | "portfolio_only"        // SSI only — exposure, no market context
  | "execution_prep"        // Market + portfolio — hedge can be sized, not submitted
  | "market_and_execution"  // Market + execution, no portfolio — can show venue, not hedge
  | "degraded"              // Partial data, significant gaps
  | "setup_required";       // Nothing works

export function determineAgentMode(caps: AgentCapabilities): AgentMode {
  const { marketIntelligence, portfolioExposure, executionVenue, signedExecution } = caps;
  if (marketIntelligence && portfolioExposure && executionVenue && signedExecution) return "full";
  if (marketIntelligence && portfolioExposure && executionVenue) return "execution_prep";
  if (marketIntelligence && executionVenue) return "market_and_execution";
  if (marketIntelligence) return "market_intelligence";
  if (portfolioExposure) return "portfolio_only";
  if (!marketIntelligence && !portfolioExposure) return "setup_required";
  return "degraded";
}

export function getExecutionBlockers(caps: AgentCapabilities): string[] {
  const blockers: string[] = [];
  if (!caps.marketIntelligence) blockers.push("SoSoValue market signals unavailable");
  if (!caps.portfolioExposure)  blockers.push("SSI portfolio exposure not connected");
  if (!caps.executionVenue)     blockers.push("SoDEX public market data unavailable");
  if (!caps.signedExecution)    blockers.push("SoDEX signed execution credentials not configured");
  return blockers;
}

export function buildRecommendation(mode: AgentMode, _caps: AgentCapabilities): string {
  switch (mode) {
    case "full":
      return "Full analysis available. Review hedge sizing and approve order submission when ready.";
    case "execution_prep":
      return "Market signals and portfolio exposure are available. Hedge size can be prepared. Signed execution credentials required to submit.";
    case "market_intelligence":
      return "Market signal analysis is available, but portfolio exposure is not connected. Connect a wallet or configure a valid SSI exposure source before hedge sizing.";
    case "market_and_execution":
      return "Market signals and execution venue are available. Portfolio exposure is needed to calculate a hedge.";
    case "portfolio_only":
      return "Portfolio exposure is available, but market signals are offline. Check SoSoValue connectivity.";
    case "degraded":
      return "Partial data available. Review individual capability status below.";
    case "setup_required":
      return "No live data sources are available. Check integration configuration in /terminal/diagnostics.";
    default:
      return "Agent mode unknown.";
  }
}
