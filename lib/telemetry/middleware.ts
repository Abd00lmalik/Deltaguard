/**
 * DeltaGuard AI — Telemetry Middleware
 * withTelemetry() HOF wraps Next.js route handlers to capture
 * round-trip latency, response size, and status codes automatically.
 */

import { NextResponse } from 'next/server';
import { logTelemetry } from './logger';

type RouteHandler = (request: Request, ...args: unknown[]) => Promise<Response | NextResponse>;

export function withTelemetry(route: string, handler: RouteHandler): RouteHandler {
  return async (request: Request, ...args: unknown[]) => {
    const startMs = Date.now();
    let statusCode = 200;
    let payloadBytes = 0;
    let cacheHit = false;
    let errorMsg: string | undefined;

    try {
      const response = await handler(request, ...args);
      statusCode = response.status;

      // Detect cache hit from headers (set by provider caches)
      const cacheControl = response.headers.get('x-deltaguard-cache') ?? '';
      cacheHit = cacheControl === 'hit';

      // Measure payload size by cloning response (non-destructive)
      try {
        const cloned = response.clone();
        const text = await cloned.text();
        payloadBytes = new TextEncoder().encode(text).length;
      } catch {
        payloadBytes = 0;
      }

      return response;
    } catch (err) {
      statusCode = 500;
      errorMsg = err instanceof Error ? err.message : 'Unknown error';
      return NextResponse.json({ error: errorMsg }, { status: 500 });
    } finally {
      const latencyMs = Date.now() - startMs;
      logTelemetry({
        route,
        method: request.method,
        timestamp: new Date().toISOString(),
        latencyMs,
        statusCode,
        payloadBytes,
        cacheHit,
        ...(errorMsg ? { error: errorMsg } : {}),
      });
    }
  };
}
