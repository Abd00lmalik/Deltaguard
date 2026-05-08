import { NextResponse } from 'next/server';
import { runAgentScan } from '@/lib/agent/decision-engine';
import { MOCK_SIGNALS } from '@/lib/mock/signals';
import { MOCK_PORTFOLIO_SUMMARY } from '@/lib/mock/portfolio';

export async function POST() {
  await new Promise((resolve) => setTimeout(resolve, 1800));
  const output = runAgentScan(MOCK_SIGNALS, MOCK_PORTFOLIO_SUMMARY);
  return NextResponse.json(output, { headers: { 'Cache-Control': 'no-store' } });
}
