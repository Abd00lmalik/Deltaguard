// Mock SoSoValue client - Wave 1 Demo Mode
import { MOCK_COMPOSITE_SCORE, MOCK_SIGNALS } from '@/lib/mock/signals';
import type { CompositeScore, MarketSignal } from '@/types/signals';

export function getMockSignals(): MarketSignal[] {
  return MOCK_SIGNALS;
}

export function getMockCompositeScore(): CompositeScore {
  return MOCK_COMPOSITE_SCORE;
}
