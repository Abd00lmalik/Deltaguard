import { NextResponse } from 'next/server';
import { checkLiveReadiness } from '@/lib/config/live-readiness';

export async function GET() {
  const readiness = checkLiveReadiness();
  // Return boolean flags only — never return env var names or values
  return NextResponse.json({
    sosovalue: readiness.sosovalue,
    ssi: readiness.ssi,
    sodexPublic: readiness.sodexPublic,
    sodexSigned: readiness.sodexSigned,
    database: readiness.database,
    llmEnabled: readiness.llmEnabled,
    allRequiredForPublicReads: readiness.allRequiredForPublicReads,
    allRequiredForSignedExecution: readiness.allRequiredForSignedExecution,
  });
}
