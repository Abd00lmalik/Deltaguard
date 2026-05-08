export interface StressScenario {
  id: string;
  label: string;
  description: string;
  btcMove: number;
  ethMove: number;
  ssiMemeMove: number;
  volatilitySpike: number;
  etfFlowPressure: number;
  estimatedDrawdownWithoutHedge: number;
  estimatedDrawdownWithHedge: number;
  hedgeEffectiveness: number;
}

export const STRESS_SCENARIOS: StressScenario[] = [
  {
    id: 'mild-btc-correction',
    label: 'Mild BTC Correction',
    description: 'Standard 15% BTC pullback with moderate volatility expansion.',
    btcMove: -15,
    ethMove: -18,
    ssiMemeMove: -25,
    volatilitySpike: 20,
    etfFlowPressure: -30,
    estimatedDrawdownWithoutHedge: -14.2,
    estimatedDrawdownWithHedge: -6.1,
    hedgeEffectiveness: 57
  },
  {
    id: 'etf-outflow-shock',
    label: 'ETF Outflow Shock',
    description: 'Sustained institutional redemptions causing cascading sell pressure.',
    btcMove: -22,
    ethMove: -26,
    ssiMemeMove: -38,
    volatilitySpike: 45,
    etfFlowPressure: -80,
    estimatedDrawdownWithoutHedge: -21.8,
    estimatedDrawdownWithHedge: -8.4,
    hedgeEffectiveness: 61
  },
  {
    id: 'treasury-yield-spike',
    label: 'Treasury Yield Spike',
    description: '10Y Treasury breaks 5.2%, triggering macro risk-off across all risk assets.',
    btcMove: -30,
    ethMove: -34,
    ssiMemeMove: -52,
    volatilitySpike: 70,
    etfFlowPressure: -65,
    estimatedDrawdownWithoutHedge: -28.6,
    estimatedDrawdownWithHedge: -10.2,
    hedgeEffectiveness: 64
  },
  {
    id: 'meme-collapse',
    label: 'Meme Index Collapse',
    description: 'ssiMEME collapse with contagion into broader DeFi indices.',
    btcMove: -12,
    ethMove: -20,
    ssiMemeMove: -74,
    volatilitySpike: 95,
    etfFlowPressure: -40,
    estimatedDrawdownWithoutHedge: -19.4,
    estimatedDrawdownWithHedge: -9.8,
    hedgeEffectiveness: 49
  },
  {
    id: '2008-style-risk-off',
    label: '2008-Style Risk-Off',
    description: 'Systemic deleveraging. All risk assets fall sharply. Correlation to 1.',
    btcMove: -55,
    ethMove: -62,
    ssiMemeMove: -89,
    volatilitySpike: 200,
    etfFlowPressure: -100,
    estimatedDrawdownWithoutHedge: -51.3,
    estimatedDrawdownWithHedge: -18.7,
    hedgeEffectiveness: 63
  }
];
