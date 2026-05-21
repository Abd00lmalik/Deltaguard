import { NextResponse } from 'next/server';
import { portfolioAssets, portfolioSummary } from '@/lib/providers/demo-provider';

export async function GET() {
  return NextResponse.json(
    { assets: portfolioAssets, summary: portfolioSummary, source: 'prototype' },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
export const dynamic = 'force-dynamic';
