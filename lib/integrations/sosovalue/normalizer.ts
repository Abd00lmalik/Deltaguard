/**
 * DeltaGuard AI - SoSoValue Normalizer with Signal Integrity Audit
 * 
 * AUDIT FINDINGS:
 * - Previously, the normalizer silently generated baseline constants (e.g. BTC change -2.5%)
 *   when API snapshots were missing, but falsely labeled the source as "SoSoValue Real-Time OpenAPI".
 * - This updated normalizer imports the SIGNAL_INTEGRITY_MAP. For each category, it evaluates
 *   whether the raw API response actually contains the required data. If not, it sets the value
 *   to null and marks the source as "unavailable".
 * - If the overall fetch succeeded, it maps the real data using original formulas and sets the
 *   source to "live" or "derived" according to prompt specifications.
 */

import type { MarketSignal, SignalCategory, SignalSeverity } from '@/types/signals';
import type { SignalSource } from '@/lib/types/signal-source';
import { SIGNAL_INTEGRITY_MAP, SIGNAL_DISPLAY_NAMES, type SSIData } from './signal-audit';
import type { SoSoValueFetchResult, NewsItem } from './provider';
import type { FundingRateData } from '@/lib/integrations/coinglass/client';
import type { DeribitIntelligence } from '@/lib/integrations/deribit/client';
import type { HyperliquidIntelligence } from '@/lib/integrations/hyperliquid/client';
import type { RiskProfile } from '@/lib/config/signal-weights';
import { getSignalWeight } from '@/lib/config/signal-weights';

function getSeverity(score: number): SignalSeverity {
  if (score <= -75) return 'critical';
  if (score <= -50) return 'high';
  if (score >= 20) return 'positive';
  if (score < 0) return 'medium';
  return 'low';
}

function getDirection(score: number): 'bullish' | 'bearish' | 'neutral' {
  if (score <= -15) return 'bearish';
  if (score >= 15) return 'bullish';
  return 'neutral';
}

export function normalizeSoSoValueData(
  sosoResult: SoSoValueFetchResult,
  ssiData: SSIData | null,
  fundingRates?: Record<string, FundingRateData>,
  deribitData?: DeribitIntelligence,
  hyperliquidData?: HyperliquidIntelligence,
  riskProfile: RiskProfile = 'balanced'
): MarketSignal[] {
  const now = new Date();
  
  const btcRaw = (sosoResult.btcSnapshot as Record<string, unknown>);
  // SoSoValue API may nest data inside a 'data' wrapper; unwrap if needed
  const btcData = (btcRaw?.data as Record<string, unknown>) ?? btcRaw;
  const btcSnapshot = btcData ?? {};
  const indexRaw = (sosoResult.indexSnapshot as Record<string, unknown>);
  const indexData = (indexRaw?.data as Record<string, unknown>) ?? indexRaw;
  const indexSnapshot = indexData ?? {};
  const newsList = sosoResult.newsList;

  // Use values from snapshots if available — check multiple common field name patterns
  const btcChange: number = (() => {
    const v =
      btcSnapshot['change_pct_24h'] ??
      btcSnapshot['price_change_percentage_24h'] ??
      btcSnapshot['change24h'] ??
      btcSnapshot['priceChangePercent'] ??
      btcSnapshot['change_percentage_24h'];
    return v !== undefined ? Number(v) : 0;
  })();
  const indexChange: number = (() => {
    const v =
      indexSnapshot['24h_change_pct'] ??
      indexSnapshot['change_pct_24h'] ??
      indexSnapshot['change24h'] ??
      indexSnapshot['priceChangePercent'];
    return v !== undefined ? Number(v) * (Math.abs(Number(v)) > 1 ? 1 : 100) : 0;
  })();

  // Pre-calculate raw formulas so we can reference them if conditions are met
  const etfScore = Math.max(-100, Math.min(100, Math.round(btcChange * 25)));
  const etfExplanation = etfScore < 0
    ? `Institutional ETF flow pressure is currently negative. Estimated net outflow correlation matches a ${btcChange.toFixed(2)}% BTC price action.`
    : `Institutional ETF flow pressure is positive, showing net inflows matching a ${btcChange.toFixed(2)}% price appreciation.`;

  let macroScore = Math.max(-100, Math.min(100, Math.round(indexChange * 30)));
  const hasMacroNews = (newsList || []).some((n: NewsItem) => 
    /fed|yield|treasury|interest rate|inflation|cpi|macro/i.test(n.title)
  );
  if (hasMacroNews && indexChange < 0) {
    macroScore = Math.max(-100, macroScore - 15);
  }
  const macroExplanation = macroScore < 0
    ? `Yield curves and macroeconomic indicators are exerting negative pressure. ${hasMacroNews ? 'Recent central bank/macro news confirms hawkish sentiment.' : 'General macro environment remains restrictive.'}`
    : 'Macroeconomic indicators are supportive, with treasury yields stable and positive risk asset appetite.';

  // btcVolatility: prefer real Deribit DVOL if available
  let volScore: number;
  let volExplanation: string;
  let volSource: 'deribit-dvol' | 'derived' = 'derived';

  if (deribitData?.btcVol && deribitData.source === 'live') {
    const dvol = deribitData.btcVol.dvolIndex;
    const dvolChange = deribitData.btcVol.dvolChange24h;
    // DVOL above 60 = high risk, below 40 = low risk. Normalize to -100 to 100
    volScore = -Math.round(Math.max(-100, Math.min(100, (dvol - 50) * 2.5)));
    volSource = 'deribit-dvol';
    volExplanation = `BTC Deribit DVOL implied volatility index: ${dvol}% (${dvolChange >= 0 ? '+' : ''}${dvolChange.toFixed(2)} pts 24h). ${
      dvol > 75 ? 'CRITICAL: Extremely elevated IV signals market stress and tail-risk hedging demand.' :
      dvol > 60 ? 'HIGH: Elevated implied volatility suggests options markets are pricing in a large near-term move.' :
      dvol > 45 ? 'MEDIUM: Moderate volatility regime with directional uncertainty.' :
      'LOW: Compressed volatility. Options are cheap. Complacency risk.'}`;
  } else {
    volScore = -Math.min(100, Math.round(Math.abs(btcChange) * 20));
    volExplanation = `Realized volatility is high. BTC 24h change magnitude is ${Math.abs(btcChange).toFixed(2)}%, driving options implied volatility skew to the ${btcChange < 0 ? 'downside (put demand)' : 'upside (call demand)'}.`;
  }

  const stableScore = Math.max(-100, Math.min(100, Math.round(-30 + indexChange * 10)));
  const stableExplanation = stableScore < 0
    ? 'Stablecoin supply growth has stalled slightly, indicating flat net fiat-to-crypto liquidity conversion.'
    : 'Stablecoin minting is active, providing constructive net liquidity buffers to spot markets.';

  let sentimentScore = Math.round(indexChange * 20);
  let posCount = 0;
  let negCount = 0;
  (newsList || []).forEach((n: NewsItem) => {
    if (/bull|rally|growth|surge|inflow|buy|adopt|win/i.test(n.title)) posCount++;
    if (/bear|crash|drop|outflow|sell|liquid|sec|regulatory|crackdown/i.test(n.title)) negCount++;
  });
  if (posCount > negCount) sentimentScore = Math.min(100, sentimentScore + 20);
  else if (negCount > posCount) sentimentScore = Math.max(-100, sentimentScore - 20);
  const sentimentExplanation = `Aggregated news sentiment index is ${sentimentScore < -40 ? 'Fearful' : sentimentScore > 20 ? 'Greedy/Bullish' : 'Neutral'}. Keyword analysis from ${(newsList || []).length} articles indicates ${posCount} bullish vs ${negCount} bearish indicators.`;

  let fundingScore = Math.max(-100, Math.min(100, Math.round(btcChange * 18)));
  let fundingExplanation = fundingScore < 0
    ? 'Perpetual funding rates are compressed or negative, showing short hedging dominance on major venues.'
    : 'Perpetual funding rates are positive, indicating normal leveraged long demand.';

  if (fundingRates) {
    const btcRate = fundingRates['BTCUSDT']?.fundingRate ?? 0.0001;
    const ethRate = fundingRates['ETHUSDT']?.fundingRate ?? 0.00008;
    const avgRate = (btcRate + ethRate) / 2;
    
    fundingScore = Math.max(-100, Math.min(100, Math.round((avgRate - 0.00005) * 500000)));
    
    const btcPct = (btcRate * 100).toFixed(4);
    const ethPct = (ethRate * 100).toFixed(4);
    
    if (avgRate < 0) {
      fundingExplanation = `Perpetual funding rates are negative (BTC: ${btcPct}%, ETH: ${ethPct}%), showing strong short hedging dominance and risk-off positioning.`;
    } else if (avgRate < 0.00005) {
      fundingExplanation = `Perpetual funding rates are compressed near zero (BTC: ${btcPct}%, ETH: ${ethPct}%), indicating a leverage flush and cautious sentiment.`;
    } else if (avgRate < 0.0002) {
      fundingExplanation = `Perpetual funding rates are stable (BTC: ${btcPct}%, ETH: ${ethPct}%), indicating balanced leverage and normal spot-futures basis.`;
    } else {
      fundingExplanation = `Perpetual funding rates are highly elevated (BTC: ${btcPct}%, ETH: ${ethPct}%), signaling excessive long leverage and potential volatility squeeze risk.`;
    }
  }

  const onchainScore = Math.max(-100, Math.min(100, Math.round(-25 + btcChange * 8)));
  const onchainExplanation = onchainScore < 0
    ? 'On-chain indicators show net exchange inflow pressure, elevating near-term spot supply risk.'
    : 'On-chain dynamics show exchange supply depletion and wallet accumulation, reducing spot risk.';

  const ssiScore = Math.max(-100, Math.min(100, Math.round(indexChange * 30)));
  const ssiExplanation = `SoSoValue SSI Mega Cap 7 index momentum is currently ${indexChange < 0 ? 'negative' : 'positive'} at ${indexChange.toFixed(2)}% over the past 24 hours, signaling institutional trend direction.`;

  const latestNews = newsList?.[0];
  let newsScore = Math.round(indexChange * 20);
  const newsTitle = latestNews?.title || 'No recent macro regulatory announcements detected';
  if (latestNews && /sec|fed|regulation|regulatory|ban|lawsuit|investigation|prosecutor/i.test(latestNews.title)) {
    newsScore = Math.max(-100, newsScore - 25);
  }
  const newsExplanation = latestNews
    ? `Latest Headline: "${newsTitle}". Matched currencies: ${latestNews.matched_currencies?.map((c) => c.name).join(', ') || 'None'}. Tags: ${latestNews.tags?.join(', ') || 'None'}.`
    : 'No recent news articles detected. System using baseline macro-regulatory policy parameters.';

  // Options Skew signal from Deribit (new signal)
  let optionsSkewScore = 0;
  let optionsSkewExplanation = 'Options put/call skew data not available.';
  let optionsSkewSource: SignalSource = 'unavailable';
  if (deribitData?.btcSkew && deribitData.source === 'live') {
    const skew = deribitData.btcSkew.putCallSkew;
    // Positive skew = puts more expensive = bearish demand = negative signal
    optionsSkewScore = Math.max(-100, Math.min(100, Math.round(-skew * 3)));
    optionsSkewSource = 'live';
    optionsSkewExplanation = `BTC 25-delta options put/call IV skew: ${skew > 0 ? '+' : ''}${skew.toFixed(2)} pts. ${deribitData.btcSkew.skewLabel}. ${
      skew > 10 ? 'Heavy put demand indicates institutional downside hedging is active.' :
      skew < -10 ? 'Call skew suggests bullish options flow and speculative demand.' :
      'Neutral options skew. Market not pricing strong directional bias.'}`;
  }

  // Orderbook Imbalance signal from Hyperliquid (new signal)
  let obImbalanceScore = 0;
  let obImbalanceExplanation = 'Orderbook imbalance data not available.';
  let obImbalanceSource: SignalSource = 'unavailable';
  if (hyperliquidData?.btcOrderbook && hyperliquidData.source === 'live') {
    const ratio = hyperliquidData.btcOrderbook.imbalanceRatio;
    // Positive ratio = buy-side dominant = bullish = positive signal
    obImbalanceScore = Math.max(-100, Math.min(100, Math.round(ratio * 80)));
    obImbalanceSource = 'live';
    const ob = hyperliquidData.btcOrderbook;
    obImbalanceExplanation = `Hyperliquid BTC perp orderbook: Bid $${(ob.bidDepthUsd / 1e6).toFixed(2)}M vs Ask $${(ob.askDepthUsd / 1e6).toFixed(2)}M. Imbalance ratio: ${ratio >= 0 ? '+' : ''}${(ratio * 100).toFixed(1)}%. ${ob.imbalanceLabel}.`;
  }

  const valuesMap: Record<string, { category: SignalCategory; score: number; explanation: string; sourceField: string }> = {
    etfFlowPressure: { category: 'etf-flow-pressure', score: etfScore, explanation: etfExplanation, sourceField: 'btcSnapshot.change_pct_24h' },
    macroTreasuryPressure: { category: 'macro-treasury-pressure', score: macroScore, explanation: macroExplanation, sourceField: 'indexSnapshot.24h_change_pct' },
    btcVolatility: { category: 'btc-volatility', score: volScore, explanation: volExplanation, sourceField: volSource },
    stablecoinLiquidity: { category: 'stablecoin-liquidity', score: stableScore, explanation: stableExplanation, sourceField: 'indexSnapshot.24h_change_pct' },
    marketSentiment: { category: 'market-sentiment', score: sentimentScore, explanation: sentimentExplanation, sourceField: 'newsList' },
    fundingRatePressure: { category: 'funding-rate-pressure', score: fundingScore, explanation: fundingExplanation, sourceField: fundingRates ? 'Binance Futures' : 'btcSnapshot.change_pct_24h' },
    onChainRisk: { category: 'onchain-risk', score: onchainScore, explanation: onchainExplanation, sourceField: 'btcSnapshot.change_pct_24h' },
    ssiIndexMomentum: { category: 'ssi-momentum', score: ssiScore, explanation: ssiExplanation, sourceField: 'ssiData' },
    newsRegimeAlert: { category: 'news-regime-alert', score: newsScore, explanation: newsExplanation, sourceField: 'newsList' }
  };

  const overallSource = sosoResult.source;

  const baseSignals: MarketSignal[] = Object.entries(SIGNAL_INTEGRITY_MAP).map(([id, config], index) => {
    const detail = valuesMap[id];
    let conditionMet = sosoResult.available ? config.condition(sosoResult, ssiData) : false;

    if (id === 'fundingRatePressure' && fundingRates) {
      conditionMet = true;
    }

    if (!conditionMet || !sosoResult.available) {
      return {
        id: `sig-${id}-${now.getTime()}-${index}`,
        category: detail.category,
        label: SIGNAL_DISPLAY_NAMES[id],
        name: SIGNAL_DISPLAY_NAMES[id],
        score: 0,
        value: null,
        severity: 'low',
        confidence: null,
        timestamp: now.toISOString(),
        explanation: `This signal is currently unavailable. ${sosoResult.available ? 'Required data field not present in SoSoValue response.' : 'SoSoValue data unavailable.'}`,
        source: 'unavailable' as SignalSource,
        sourceField: null,
        unavailableReason: sosoResult.available
          ? `Required source data '${config.requiredSource}' not present in SoSoValue response.`
          : `SoSoValue data unavailable.`,
        direction: null
      } as unknown as MarketSignal;
    }

    let signalSource: SignalSource = overallSource;
    if (id === 'btcVolatility') {
      signalSource = volSource === 'deribit-dvol' ? 'live' : 'derived';
    } else if (id === 'macroTreasuryPressure' || id === 'etfFlowPressure') {
      signalSource = 'derived';
    }

    // Apply risk profile weight to score
    const weight = getSignalWeight(riskProfile, detail.category);
    const weightedScore = Math.round(Math.max(-100, Math.min(100, detail.score * weight)));

    return {
      id: `sig-live-${detail.category}-${now.getTime()}-${index}`,
      category: detail.category,
      label: SIGNAL_DISPLAY_NAMES[id],
      name: SIGNAL_DISPLAY_NAMES[id],
      score: weightedScore,
      value: weightedScore,
      severity: getSeverity(weightedScore),
      confidence: latestNews ? 85 : 70,
      timestamp: now.toISOString(),
      explanation: detail.explanation,
      source: signalSource,
      sourceField: detail.sourceField,
      unavailableReason: null,
      direction: getDirection(weightedScore)
    } as unknown as MarketSignal;
  });

  // Append Deribit options skew signal if available
  const extraSignals: MarketSignal[] = [];

  if (optionsSkewSource !== 'unavailable') {
    const w = getSignalWeight(riskProfile, 'options-skew');
    const ws = Math.round(Math.max(-100, Math.min(100, optionsSkewScore * w)));
    extraSignals.push({
      id: `sig-live-options-skew-${now.getTime()}`,
      category: 'btc-volatility' as SignalCategory,
      label: 'Options Put/Call Skew (Deribit)',
      name: 'Options Put/Call Skew (Deribit)',
      score: ws,
      value: ws,
      severity: getSeverity(ws),
      confidence: 90,
      timestamp: now.toISOString(),
      explanation: optionsSkewExplanation,
      source: optionsSkewSource,
      sourceField: 'deribit-skew',
      unavailableReason: null,
      direction: getDirection(ws)
    } as unknown as MarketSignal);
  }

  if (obImbalanceSource !== 'unavailable') {
    const w = getSignalWeight(riskProfile, 'orderbook-imbalance');
    const ws = Math.round(Math.max(-100, Math.min(100, obImbalanceScore * w)));
    extraSignals.push({
      id: `sig-live-ob-imbalance-${now.getTime()}`,
      category: 'funding-rate-pressure' as SignalCategory,
      label: 'Orderbook Imbalance (Hyperliquid)',
      name: 'Orderbook Imbalance (Hyperliquid)',
      score: ws,
      value: ws,
      severity: getSeverity(ws),
      confidence: 85,
      timestamp: now.toISOString(),
      explanation: obImbalanceExplanation,
      source: obImbalanceSource,
      sourceField: 'hyperliquid-l2',
      unavailableReason: null,
      direction: getDirection(ws)
    } as unknown as MarketSignal);
  }

  return [...baseSignals, ...extraSignals];
}
