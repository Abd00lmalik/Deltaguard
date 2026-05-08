import type { LucideIcon } from 'lucide-react';
import { GlowCard } from '@/components/ui/GlowCard';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface IntegrationCardProps {
  name: string;
  icon: LucideIcon;
  statusBadge: string;
  description?: string;
  currentBehavior?: string;
  futureBehavior?: string;
  envVars?: string[];
  filePath?: string;
  readmePath?: string;
}

export function IntegrationStatusCard({
  name,
  icon: Icon,
  statusBadge,
  description,
  currentBehavior,
  futureBehavior
}: IntegrationCardProps) {
  const body = description ?? [currentBehavior, futureBehavior].filter(Boolean).join(' ');

  return (
    <GlowCard className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-accent-lime/20 bg-accent-lime-dim p-2 text-accent-lime">
            <Icon className="h-5 w-5" />
          </div>
          <h3 className="font-sora text-base font-bold text-white">{name}</h3>
        </div>
        <StatusBadge variant="muted" label={statusBadge} />
      </div>
      <p className="mt-5 font-manrope text-sm leading-6 text-text-secondary">{body}</p>
    </GlowCard>
  );
}

export default IntegrationStatusCard;
