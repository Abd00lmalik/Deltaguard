import { NextResponse } from 'next/server';
import { getMockSignals, getMockCompositeScore } from '@/lib/integrations/sosovalue/mock-client';

export async function GET() {
  await new Promise((r) => setTimeout(r, 400)); // preserve existing latency simulation
  return NextResponse.json({
    signals: getMockSignals(),
    composite: getMockCompositeScore(),
    source: 'prototype',
    fetchedAt: new Date().toISOString(),
  });
}
export const dynamic = 'force-dynamic';
