import { NextResponse } from 'next/server';
import { runGeminiAgentScan } from '@/lib/agent/gemini-client';
import { fetchMarketSignals } from '@/lib/integrations/sosovalue/client';
import { fetchPortfolioSummary } from '@/lib/integrations/ssi/client';
import { getMockSignals } from '@/lib/integrations/sosovalue/mock-client';
import { getMockPortfolioSummary } from '@/lib/integrations/ssi/mock-client';

const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';

export async function POST() {
  let signals;
  let portfolioSummary;

  try {
    if (!DEMO) {
      signals = await fetchMarketSignals();
    } else {
      signals = getMockSignals();
    }
  } catch (error) {
    console.error('Failed to fetch market signals from SoSoValue:', error);
    signals = getMockSignals();
  }

  try {
    if (!DEMO) {
      portfolioSummary = await fetchPortfolioSummary();
    } else {
      portfolioSummary = getMockPortfolioSummary();
    }
  } catch (error) {
    console.error('Failed to fetch portfolio summary from SSI:', error);
    portfolioSummary = getMockPortfolioSummary();
  }

  // Artificial delay to mimic scanning/thinking process in UI
  await new Promise((resolve) => setTimeout(resolve, 1800));

  const output = await runGeminiAgentScan(signals, portfolioSummary, []);
  return NextResponse.json(output, { headers: { 'Cache-Control': 'no-store' } });
}

