/**
 * DeltaGuard AI — Portfolio Snapshot Storage
 * Persists per-wallet portfolio value snapshots to Vercel KV (or in-memory fallback).
 * The dashboard chart reads these snapshots to render a real portfolio value history.
 *
 * Schema: KV key = `portfolio_history:{address}` → JSON array of PortfolioSnapshot[]
 * Max 30 snapshots stored (rolling window — oldest dropped when full).
 */

export interface PortfolioSnapshot {
  timestamp: string;   // ISO 8601
  valueUsd: number;    // Total portfolio value at that time
  netDelta: number;    // Weighted net delta at that time
  assetCount: number;  // Number of assets
}

const MAX_SNAPSHOTS = 30;

// In-memory fallback for local dev or when KV is not configured
const inMemorySnapshots: Record<string, PortfolioSnapshot[]> = {};

function isKvConfigured(): boolean {
  return (
    process.env.EXECUTION_STORAGE_PROVIDER === 'kv' &&
    !!process.env.KV_REST_API_URL &&
    !!process.env.KV_REST_API_TOKEN
  );
}

function kvKey(address: string): string {
  return `portfolio_history:${address.toLowerCase()}`;
}

export async function getPortfolioSnapshots(address: string): Promise<PortfolioSnapshot[]> {
  if (isKvConfigured()) {
    try {
      const url = `${process.env.KV_REST_API_URL}/get/${kvKey(address)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const json = await res.json() as { result?: string };
        if (json.result) {
          return JSON.parse(json.result) as PortfolioSnapshot[];
        }
      }
    } catch (e) {
      console.warn('[DeltaGuard] Failed to read portfolio history from KV:', e);
    }
  }
  return inMemorySnapshots[address.toLowerCase()] ?? [];
}

export async function appendPortfolioSnapshot(
  address: string,
  snapshot: PortfolioSnapshot
): Promise<void> {
  const existing = await getPortfolioSnapshots(address);

  // Deduplicate: if the last snapshot was less than 5 minutes ago, overwrite it instead of appending
  const lastSnapshot = existing[existing.length - 1];
  const fiveMinutesMs = 5 * 60 * 1000;
  let updated: PortfolioSnapshot[];
  if (lastSnapshot && Date.now() - new Date(lastSnapshot.timestamp).getTime() < fiveMinutesMs) {
    updated = [...existing.slice(0, -1), snapshot];
  } else {
    updated = [...existing, snapshot];
  }

  // Rolling window — keep only the last MAX_SNAPSHOTS
  if (updated.length > MAX_SNAPSHOTS) {
    updated = updated.slice(updated.length - MAX_SNAPSHOTS);
  }

  if (isKvConfigured()) {
    try {
      const url = `${process.env.KV_REST_API_URL}/set/${kvKey(address)}`;
      await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
        body: JSON.stringify(JSON.stringify(updated)),
      });
      return;
    } catch (e) {
      console.warn('[DeltaGuard] Failed to write portfolio history to KV:', e);
    }
  }

  inMemorySnapshots[address.toLowerCase()] = updated;
}
