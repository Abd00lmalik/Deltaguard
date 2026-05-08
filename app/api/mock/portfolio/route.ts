import { NextResponse } from 'next/server';
import { MOCK_PORTFOLIO_ASSETS, MOCK_PORTFOLIO_SUMMARY } from '@/lib/mock/portfolio';

export async function GET() {
  return NextResponse.json(
    { assets: MOCK_PORTFOLIO_ASSETS, summary: MOCK_PORTFOLIO_SUMMARY },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
