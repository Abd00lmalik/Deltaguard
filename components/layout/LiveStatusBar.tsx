// DeltaGuard AI - Live terminal environment status bar component
// Polls /api/terminal/health every 60 seconds.
// All status derived from real health check results — never from client-side env vars.
// Status badge and signal page source label will ALWAYS agree because both use the shared provider cache.
'use client';

import React, { useEffect, useState } from 'react';
import { FlaskConical, Globe } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useNetwork } from '@/lib/store/network-context';
import type { ProviderHealth } from '@/lib/types/signal-source';

interface HealthEntry {
  status: ProviderHealth;
  connected: boolean;
}

interface HealthResponse {
  sosovalue:   HealthEntry;
  ssi:         HealthEntry;
  sodexPublic: HealthEntry;
  sodexSigned: HealthEntry;
  database:    HealthEntry;
  signalSource?: string;
  checkedAt?: string;
}

const DOT_COLOR: Record<ProviderHealth | 'checking', string> = {
  connected:      'bg-accent-lime shadow-[0_0_8px_rgba(156,255,0,0.5)]',
  degraded:       'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]',
  unavailable:    'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse',
  setup_required: 'bg-neutral-500',
  checking:       'bg-neutral-400 animate-pulse',
};

const TEXT_COLOR: Record<ProviderHealth | 'checking', string> = {
  connected:      'text-accent-lime',
  degraded:       'text-amber-400',
  unavailable:    'text-red-500',
  setup_required: 'text-neutral-500',
  checking:       'text-neutral-400',
};

const STATUS_LABEL: Record<ProviderHealth | 'checking', string> = {
  connected:      'Connected',
  degraded:       'Degraded',
  unavailable:    'Offline',
  setup_required: 'Not Configured',
  checking:       'Checking...',
};

function StatusPill({ label, health }: { label: string; health: ProviderHealth | 'checking' }) {
  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap">
      <span className="text-text-muted">{label}:</span>
      <span className={cn('h-1.5 w-1.5 rounded-full', DOT_COLOR[health])} />
      <span className={cn('font-medium', TEXT_COLOR[health])}>
        {STATUS_LABEL[health]}
      </span>
    </div>
  );
}

export function LiveStatusBar() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const { isTestnet, networkLabel, toggleNetwork } = useNetwork();

  useEffect(() => {
    let active = true;

    const checkHealth = () => {
      const headers: Record<string, string> = {};
      const customApiKey = localStorage.getItem('dg_sodex_api_key');
      const customApiSecret = localStorage.getItem('dg_sodex_api_private_key');
      if (customApiKey) headers['x-sodex-api-key'] = customApiKey;
      if (customApiSecret) headers['x-sodex-api-private-key'] = customApiSecret;

      fetch('/api/terminal/health', { headers })
        .then((res) => res.json())
        .then((data: HealthResponse) => {
          if (active) setHealth(data);
        })
        .catch((err) => console.error('Failed to fetch health status:', err));
    };

    checkHealth();
    const interval = setInterval(checkHealth, 60000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const sos  = health?.sosovalue?.status   ?? 'checking';
  const sodP = health?.sodexPublic?.status ?? 'checking';
  const sodS = health?.sodexSigned?.status ?? 'checking';

  return (
    <div className="flex h-9 items-center justify-between border-b border-accent-lime/10 bg-accent-lime/[0.04] px-4 font-manrope text-[11px] text-text-muted overflow-hidden">
      <div className="flex items-center gap-5 overflow-x-auto">
        <StatusPill label="SoSoValue" health={sos as ProviderHealth | 'checking'} />
        <StatusPill label="SoDEX Public" health={sodP as ProviderHealth | 'checking'} />
        <StatusPill label="SoDEX Signed" health={sodS as ProviderHealth | 'checking'} />
      </div>

      {/* Runtime Network Toggle */}
      <button
        onClick={toggleNetwork}
        title={`Currently on ${networkLabel}. Click to switch.`}
        className={cn(
          'flex items-center gap-1.5 rounded-full px-2.5 py-1 font-manrope text-[10px] font-bold tracking-wider uppercase transition-colors shrink-0',
          isTestnet
            ? 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25'
            : 'bg-accent-lime/10 text-accent-lime hover:bg-accent-lime/20'
        )}
      >
        {isTestnet ? <FlaskConical className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
        {isTestnet ? 'Testnet' : 'Mainnet'}
      </button>
    </div>
  );
}

export default LiveStatusBar;
