'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Lock, Minus, PauseCircle, Plus } from 'lucide-react';
import { Topbar } from '@/components/layout/Topbar';
import { GlowCard } from '@/components/ui/GlowCard';
import { PillButton } from '@/components/ui/PillButton';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { cn } from '@/lib/utils/cn';

export default function TerminalSettingsPage() {
  const [settings, setSettings] = useState({
    maxLeverage: 3,
    maxHedgePercent: 50,
    autoExecute: false,
    requireConfirmation: true,
    slippageLimit: 0.5,
    minConfidence: 60,
    defaultLeverage: 2,
    hedgeThreshold: -50,
    watchThreshold: 20
  });
  const [riskProfile, setRiskProfile] = useState<'conservative' | 'balanced' | 'aggressive'>('balanced');
  const [sodexApiKey, setSodexApiKey] = useState('');
  const [sodexApiPrivateKey, setSodexApiPrivateKey] = useState('');
  const [emergencyPaused, setEmergencyPaused] = useState(false);
  const [showPauseConfirm, setShowPauseConfirm] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSodexApiKey(localStorage.getItem('dg_sodex_api_key') || '');
      setSodexApiPrivateKey(localStorage.getItem('dg_sodex_api_private_key') || '');
      
      const savedProfile = localStorage.getItem('dg_risk_profile');
      if (savedProfile === 'conservative' || savedProfile === 'balanced' || savedProfile === 'aggressive') {
        setRiskProfile(savedProfile);
      }

      const savedSettings = localStorage.getItem('dg_agent_settings');
      if (savedSettings) {
        try {
          setSettings(JSON.parse(savedSettings));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  function saveSodexCredentials(key: string, secret: string) {
    setSodexApiKey(key);
    setSodexApiPrivateKey(secret);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dg_sodex_api_key', key);
      localStorage.setItem('dg_sodex_api_private_key', secret);
    }
  }

  function updateRiskProfile(profile: 'conservative' | 'balanced' | 'aggressive') {
    setRiskProfile(profile);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dg_risk_profile', profile);
    }
  }

  function updateSetting<K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) {
    setSettings((current) => {
      const next = { ...current, [key]: value };
      if (typeof window !== 'undefined') {
        localStorage.setItem('dg_agent_settings', JSON.stringify(next));
      }
      return next;
    });
  }

  return (
    <>
      <Topbar title="Settings" />
      <div className="space-y-6 p-4 pb-24 sm:p-6 lg:p-8">
        <header>
          <SectionLabel>Risk Controls — Live Testnet</SectionLabel>
          <h1 className="mt-3 font-sora text-2xl font-bold text-white">Agent Settings</h1>
          <p className="mt-2 max-w-2xl font-manrope text-sm leading-6 text-text-secondary">
            Configure risk thresholds and execution guardrails for the live testnet environment. Manual confirmation is always enforced.
          </p>
        </header>

        <GlowCard className="p-5">
          <h2 className="font-sora text-base font-bold text-white">Risk Profile</h2>
          <p className="mt-1 font-manrope text-xs text-text-muted">
            Select a risk profile to adjust the signal weights and hedge thresholds. A conservative profile will trigger hedges earlier.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {[
              {
                id: 'conservative' as const,
                label: 'Conservative',
                description: 'Higher weight on bearish signals. Hedges earlier (threshold: -35).',
                color: 'border-accent-lime/30 text-accent-lime bg-accent-lime-dim'
              },
              {
                id: 'balanced' as const,
                label: 'Balanced',
                description: 'Symmetric risk assessment. Default setting (threshold: -50).',
                color: 'border-blue-500/30 text-blue-400 bg-blue-500/10'
              },
              {
                id: 'aggressive' as const,
                label: 'Aggressive',
                description: 'Lower weight on bearish signals. Hedges later (threshold: -65).',
                color: 'border-purple-500/30 text-purple-400 bg-purple-500/10'
              }
            ].map((p) => {
              const active = riskProfile === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => updateRiskProfile(p.id)}
                  type="button"
                  className={cn(
                    "flex flex-col text-left p-4 rounded-xl border transition-all duration-200 outline-none",
                    active
                      ? `${p.color} ring-1 ring-white/10`
                      : "border-white/[0.06] bg-white/[0.02] text-text-muted hover:border-white/15 hover:text-white"
                  )}
                >
                  <span className="font-sora text-sm font-bold">{p.label}</span>
                  <span className="mt-2 font-manrope text-xs leading-4 opacity-80">{p.description}</span>
                </button>
              );
            })}
          </div>
        </GlowCard>

        <GlowCard className="p-5">
          <h2 className="font-sora text-base font-bold text-white">Execution Controls</h2>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div>
              <label className="font-manrope text-sm font-bold text-white">Max Leverage</label>
              <p className="mt-1 font-manrope text-xs text-text-muted">Maximum leverage the agent may propose. Cannot exceed 5x.</p>
              <div className="mt-3 flex items-center gap-2">
                <PillButton variant="secondary" size="sm" icon={<Minus className="h-4 w-4" />} onClick={() => updateSetting('maxLeverage', Math.max(1, settings.maxLeverage - 1))} />
                <input
                  type="number" min={1} max={5} value={settings.maxLeverage}
                  onChange={(e) => updateSetting('maxLeverage', Math.min(5, Math.max(1, Number(e.target.value))))}
                  className="h-11 w-24 rounded-full border border-border-subtle bg-surface-2 px-4 text-center font-mono text-white outline-none focus:border-border-active"
                />
                <PillButton variant="secondary" size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => updateSetting('maxLeverage', Math.min(5, settings.maxLeverage + 1))} />
              </div>
            </div>

            <label>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="font-manrope text-sm font-bold text-white">Max Hedge Allocation</span>
                  <p className="mt-1 font-manrope text-xs text-text-muted">Maximum percentage of portfolio value the agent may propose to hedge.</p>
                </div>
                <span className="rounded-full bg-accent-lime-dim px-3 py-1 font-mono text-xs text-accent-lime">{settings.maxHedgePercent}%</span>
              </div>
              <input type="range" min={10} max={100} value={settings.maxHedgePercent}
                onChange={(e) => updateSetting('maxHedgePercent', Number(e.target.value))}
                className="mt-4 h-2 w-full rounded-full bg-white/10" />
            </label>

            <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-manrope text-sm font-bold text-white">Auto-Execution</p>
                  <p className="mt-1 font-manrope text-xs text-text-muted">Manual confirmation always required — auto-execution is not available.</p>
                </div>
                <div className="flex h-7 w-14 cursor-not-allowed items-center rounded-full bg-white/10 p-1 opacity-70">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-text-muted"><Lock className="h-3 w-3 text-black" /></span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-accent-lime/15 bg-accent-lime-dim p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-manrope text-sm font-bold text-white">Require Confirmation</p>
                  <p className="mt-1 font-manrope text-xs text-text-muted">Every live agent action requires explicit user approval.</p>
                </div>
                <div className="flex h-7 w-14 items-center justify-end rounded-full bg-accent-lime p-1">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black"><Lock className="h-3 w-3 text-accent-lime" /></span>
                </div>
              </div>
            </div>
          </div>
        </GlowCard>

        <GlowCard className="p-5">
          <h2 className="font-sora text-base font-bold text-white">Signal Thresholds</h2>
          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            {[
              ['Hedge Threshold', 'hedgeThreshold', -100, 0, 'Agent proposes hedge when composite score falls below this value.'],
              ['Watch Threshold Upper Bound', 'watchThreshold', -50, 50, 'Agent enters Watch mode between hedge threshold and this value.'],
              ['Minimum Signal Confidence', 'minConfidence', 0, 100, 'Agent will not propose a hedge if confidence is below this level.']
            ].map(([label, key, min, max, description]) => (
              <label key={String(key)}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-manrope text-sm font-bold text-white">{label}</span>
                    <p className="mt-1 font-manrope text-xs leading-5 text-text-muted">{description}</p>
                  </div>
                  <span className="rounded-full bg-accent-lime-dim px-2.5 py-1 font-mono text-xs text-accent-lime">
                    {settings[key as keyof typeof settings]}{key === 'minConfidence' ? '%' : ''}
                  </span>
                </div>
                <input
                  type="range" min={Number(min)} max={Number(max)}
                  value={Number(settings[key as keyof typeof settings])}
                  onChange={(e) => updateSetting(key as keyof typeof settings, Number(e.target.value) as never)}
                  className="mt-4 h-2 w-full rounded-full bg-white/10"
                />
              </label>
            ))}
          </div>
        </GlowCard>

        <GlowCard className="p-5">
          <h2 className="font-sora text-base font-bold text-white">Execution Parameters</h2>
          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            <label>
              <span className="font-manrope text-sm font-bold text-white">Default Slippage Limit</span>
              <p className="mt-1 font-manrope text-xs text-text-muted">Maximum acceptable slippage for live orders.</p>
              <input type="number" step="0.1" value={settings.slippageLimit}
                onChange={(e) => updateSetting('slippageLimit', Number(e.target.value))}
                className="mt-3 h-11 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 font-mono text-white outline-none focus:border-border-active" />
            </label>
            <label>
              <span className="font-manrope text-sm font-bold text-white">Default Leverage</span>
              <p className="mt-1 font-manrope text-xs text-text-muted">Default leverage applied to live hedge proposals.</p>
              <input type="number" min={1} max={5} value={settings.defaultLeverage}
                onChange={(e) => updateSetting('defaultLeverage', Math.min(5, Math.max(1, Number(e.target.value))))}
                className="mt-3 h-11 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 font-mono text-white outline-none focus:border-border-active" />
            </label>
            <label>
              <span className="font-manrope text-sm font-bold text-white">Preferred Hedge Venue</span>
              <p className="mt-1 font-manrope text-xs text-text-muted">Live order routing venue.</p>
              <select disabled className="mt-3 h-11 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 font-mono text-text-muted outline-none">
                <option>SoDEX Testnet</option>
              </select>
            </label>
          </div>
        </GlowCard>

        <GlowCard className="p-5">
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5 text-accent-lime" />
            <h2 className="font-sora text-base font-bold text-white">SoDEX Execution Credentials</h2>
          </div>
          <p className="mt-2 font-manrope text-xs text-text-secondary leading-5">
            Configure your personal SoDEX API Key and API Private Key. These are stored locally in your browser and used only to authorize and sign transactions sent to the SoDEX testnet.
          </p>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div>
              <label className="font-manrope text-sm font-bold text-white">SoDEX API Key</label>
              <input
                type="text"
                placeholder="e.g. api-key-01"
                value={sodexApiKey}
                onChange={(e) => saveSodexCredentials(e.target.value, sodexApiPrivateKey)}
                className="mt-2 h-11 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 font-mono text-white outline-none focus:border-border-active"
              />
            </div>
            <div>
              <label className="font-manrope text-sm font-bold text-white">SoDEX API Private Key (Hex String)</label>
              <input
                type="password"
                placeholder="0x..."
                value={sodexApiPrivateKey}
                onChange={(e) => saveSodexCredentials(sodexApiKey, e.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-border-subtle bg-surface-2 px-4 font-mono text-white outline-none focus:border-border-active"
              />
            </div>
          </div>
        </GlowCard>

        <GlowCard className="border-danger/25 p-5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-danger" />
            <h2 className="font-sora text-base font-bold text-white">Emergency Stop</h2>
          </div>
          {!emergencyPaused ? (
            <div className="mt-5">
              <PillButton variant="danger" icon={<PauseCircle className="h-4 w-4" />} onClick={() => setShowPauseConfirm(true)}>
                Pause All Agent Activity
              </PillButton>
              {showPauseConfirm && (
                <div className="mt-4 rounded-xl border border-danger/25 bg-danger-dim p-4">
                  <p className="font-manrope text-sm text-text-secondary">
                    Are you sure? This will halt all live pending proposals and prevent new scans.
                  </p>
                  <div className="mt-4 flex gap-3">
                    <PillButton variant="danger" onClick={() => { setEmergencyPaused(true); setShowPauseConfirm(false); }}>
                      Confirm Pause
                    </PillButton>
                    <PillButton variant="ghost" onClick={() => setShowPauseConfirm(false)}>Cancel</PillButton>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-danger/30 bg-danger-dim p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <StatusBadge variant="danger" label="Agent Paused" />
                  <p className="mt-3 font-sora text-lg font-bold text-danger">All live activity halted</p>
                </div>
                <PillButton onClick={() => setEmergencyPaused(false)}>Resume Agent</PillButton>
              </div>
            </div>
          )}
        </GlowCard>

        <section className="rounded-2xl bg-white/[0.025] p-5 font-manrope text-sm leading-7 text-text-secondary">
          DeltaGuard AI does not guarantee downside protection. Live agent recommendations do not constitute financial
          advice. All live actions require your explicit approval.
        </section>
      </div>
    </>
  );
}
