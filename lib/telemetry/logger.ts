/**
 * DeltaGuard AI — Telemetry Logger
 * In-memory ring buffer of API route telemetry.
 * Captures: route, latency, status, payload size, cache hit.
 * Last 100 entries. Exposed via /api/terminal/diagnostics.
 */

export interface TelemetryEntry {
  route: string;
  method: string;
  timestamp: string;
  latencyMs: number;
  statusCode: number;
  payloadBytes: number;
  cacheHit: boolean;
  error?: string;
}

const MAX_ENTRIES = 100;
const ringBuffer: TelemetryEntry[] = [];

export function logTelemetry(entry: TelemetryEntry): void {
  ringBuffer.push(entry);
  if (ringBuffer.length > MAX_ENTRIES) {
    ringBuffer.shift(); // Remove oldest entry
  }
}

export function getRecentTelemetry(count = 20): TelemetryEntry[] {
  return ringBuffer.slice(-count).reverse(); // Most recent first
}

export function getTelemetrySummary(): {
  totalRequests: number;
  avgLatencyMs: number;
  errorRate: number;
  cacheHitRate: number;
} {
  if (ringBuffer.length === 0) {
    return { totalRequests: 0, avgLatencyMs: 0, errorRate: 0, cacheHitRate: 0 };
  }
  const total = ringBuffer.length;
  const avgLatencyMs = Math.round(ringBuffer.reduce((s, e) => s + e.latencyMs, 0) / total);
  const errors = ringBuffer.filter(e => e.statusCode >= 400).length;
  const cacheHits = ringBuffer.filter(e => e.cacheHit).length;
  return {
    totalRequests: total,
    avgLatencyMs,
    errorRate: Number((errors / total).toFixed(4)),
    cacheHitRate: Number((cacheHits / total).toFixed(4)),
  };
}
