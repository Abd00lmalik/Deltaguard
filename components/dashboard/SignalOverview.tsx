import Link from 'next/link';
import { MOCK_SIGNALS } from '@/lib/mock/signals';
import { GlowCard } from '@/components/ui/GlowCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { cn } from '@/lib/utils/cn';

const severityRank = { critical: 0, high: 1, medium: 2, low: 3, positive: 4 };

export function SignalOverview() {
  const signals = [...MOCK_SIGNALS].sort((a, b) => severityRank[a.severity] - severityRank[b.severity]).slice(0, 4);

  return (
    <GlowCard className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-sora text-base font-bold text-white">Signal Overview</h3>
        <Link href="/signals" className="font-manrope text-xs font-semibold text-accent-lime hover:text-white">
          View all signals -&gt;
        </Link>
      </div>
      <div className="space-y-3">
        {signals.map((signal) => (
          <div key={signal.id} className="rounded-xl border border-white/5 bg-white/[0.025] p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-manrope text-sm font-semibold text-white">{signal.label}</p>
              <StatusBadge
                variant={signal.severity === 'critical' ? 'danger' : signal.severity === 'high' ? 'warning' : 'muted'}
                label={signal.severity}
              />
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="h-1.5 flex-1 rounded-full bg-white/10">
                <div
                  className={cn(
                    'h-full rounded-full',
                    signal.score < -50 ? 'bg-danger' : signal.score < 0 ? 'bg-warning' : 'bg-accent-lime'
                  )}
                  style={{ width: `${Math.abs(signal.score)}%` }}
                />
              </div>
              <span className="font-mono text-xs text-danger">{signal.score}</span>
            </div>
          </div>
        ))}
      </div>
    </GlowCard>
  );
}

export default SignalOverview;
