/**
 * DeltaGuard AI - SoSoValue Integration Server Client (Live mode only)
 * 
 * AUDIT FINDINGS:
 * - This integration was originally making duplicate raw HTTP requests during a single render cycle,
 *   which could lead to mismatched status readings when some endpoints succeeded and others failed.
 * - Refactored to utilize the shared singleton provider `getSoSoValueData()` to leverage a 30s cache.
 * - Added a composite score rule: if more than half of the signals (5 out of 9) are unavailable,
 *   the composite score is set to null rather than averaging the remaining values.
 */

import type { CompositeScore, MarketSignal, SignalSeverity } from '@/types/signals';
import { normalizeSoSoValueData } from './normalizer';
import { getSoSoValueData } from './provider';

const SEVERITY_WEIGHTS: Record<SignalSeverity, number> = {
  critical: 1.45,
  high: 1.16,
  medium: 0.82,
  low: 0.55,
  positive: 1
};

export function calculateCompositeScore(signals: MarketSignal[]): number | null {
  const unavailableSignals = signals.filter(
    (s: MarketSignal) => s.value === null || s.source === 'unavailable'
  );
  if (unavailableSignals.length > signals.length / 2) {
    return null;
  }

  const activeSignals = signals.filter(
    (s: MarketSignal) => s.value !== null && s.source !== 'unavailable'
  );
  if (activeSignals.length === 0) return null;

  const weighted = activeSignals.reduce(
    (acc, signal) => {
      const weight = SEVERITY_WEIGHTS[signal.severity] * ((signal.confidence ?? 100) / 100);
      return {
        score: acc.score + signal.score * weight,
        weight: acc.weight + weight
      };
    },
    { score: 0, weight: 0 }
  );
  const rawScore = weighted.weight === 0 ? 0 : weighted.score / weighted.weight;
  return Math.round(Math.max(-100, Math.min(100, rawScore * 1.07)));
}

export async function fetchMarketSignals(): Promise<MarketSignal[]> {
  const data = await getSoSoValueData();
  return normalizeSoSoValueData(data, null);
}

export async function fetchCompositeScore(): Promise<CompositeScore> {
  try {
    const signals = await fetchMarketSignals();
    const score = calculateCompositeScore(signals);
    
    if (score === null) {
      return {
        value: null,
        label: 'UNAVAILABLE',
        regime: 'neutral',
        lastUpdated: new Date().toISOString()
      };
    }

    let regime: 'risk-off' | 'caution' | 'neutral' | 'risk-on' = 'neutral';
    let label = 'NEUTRAL';
    if (score < -50) {
      regime = 'risk-off';
      label = 'RISK-OFF';
    } else if (score <= 20) {
      regime = 'caution';
      label = 'CAUTION';
    } else {
      regime = 'risk-on';
      label = 'RISK-ON';
    }
    return {
      value: score,
      label,
      regime,
      lastUpdated: new Date().toISOString()
    };
  } catch (err) {
    console.error('Failed to calculate composite score from live signals:', err);
    throw err;
  }
}
