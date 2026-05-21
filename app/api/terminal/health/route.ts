import { NextResponse } from 'next/server';
import { checkLiveReadiness } from '@/lib/config/live-readiness';

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 4000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(id);
  }
}

export async function GET() {
  const readiness = checkLiveReadiness();

  let sosovalueHealthy = false;
  let ssiHealthy = false;
  let sodexPublicHealthy = false;

  // 1. SoSoValue Health Check
  if (readiness.sosovalue) {
    try {
      const baseUrl = process.env.SOSOVALUE_BASE_URL || 'https://openapi.sosovalue.com/openapi/v1';
      const endpoint = baseUrl.endsWith('/') ? `${baseUrl}news` : `${baseUrl}/news`;
      const res = await fetchWithTimeout(`${endpoint}?page_size=1`, {
        headers: { 'x-soso-api-key': process.env.SOSOVALUE_API_KEY || '' }
      });
      if (res.status === 200 || res.status === 201) {
        sosovalueHealthy = true;
      } else {
        console.warn(`SoSoValue health check returned status ${res.status}`);
      }
    } catch (err) {
      console.error('SoSoValue health check failed:', err);
    }
  }

  // 2. SSI Health Check
  if (readiness.ssi) {
    try {
      const baseUrl = process.env.SSI_API_BASE_URL || '';
      const endpoint = baseUrl.endsWith('/') ? `${baseUrl}portfolio/holdings` : `${baseUrl}/portfolio/holdings`;
      const res = await fetchWithTimeout(endpoint, { method: 'GET' });
      if (res.status === 200 || res.status === 201) {
        ssiHealthy = true;
      } else {
        console.warn(`SSI health check returned status ${res.status}`);
      }
    } catch (err) {
      console.error('SSI health check failed:', err);
    }
  }

  // 3. SoDEX Public Health Check
  if (readiness.sodexPublic) {
    try {
      const baseUrl = process.env.SODEX_BASE_URL || 'https://api.sodex-testnet.com/v1/perpetuals';
      // Try calling the base URL to check if the server is responsive
      const res = await fetchWithTimeout(baseUrl, { method: 'GET' });
      // A status of 200, 404, or 405 indicates the server is up and responsive (e.g. endpoint exists or handles routing)
      if (res.status >= 200 && res.status < 500) {
        sodexPublicHealthy = true;
      } else {
        console.warn(`SoDEX public health check returned status ${res.status}`);
      }
    } catch (err) {
      console.error('SoDEX public health check failed:', err);
    }
  }

  const sodexSignedHealthy = readiness.sodexSigned && sodexPublicHealthy;

  return NextResponse.json({
    sosovalue: sosovalueHealthy,
    ssi: ssiHealthy,
    sodexPublic: sodexPublicHealthy,
    sodexSigned: sodexSignedHealthy,
    database: readiness.database,
    allRequiredForPublicReads: sosovalueHealthy && sodexPublicHealthy,
    allRequiredForSignedExecution: sosovalueHealthy && ssiHealthy && sodexSignedHealthy,
  });
}

export const dynamic = 'force-dynamic';
