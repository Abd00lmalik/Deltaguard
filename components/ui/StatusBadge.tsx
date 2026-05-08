import { cn } from '@/lib/utils/cn';

export type StatusBadgeVariant =
  | 'demo'
  | 'signal'
  | 'risk'
  | 'hedge'
  | 'safe'
  | 'warning'
  | 'danger'
  | 'muted';

interface StatusBadgeProps {
  label: string;
  variant?: StatusBadgeVariant;
  className?: string;
}

const variantStyles: Record<StatusBadgeVariant, string> = {
  demo: 'border-white/10 bg-white/5 text-text-secondary',
  signal: 'border-accent-lime/30 bg-accent-lime-dim text-accent-lime',
  risk: 'border-warning/35 bg-warning-dim text-warning',
  hedge: 'border-accent-lime/35 bg-accent-lime-dim text-accent-lime',
  safe: 'border-accent-lime/35 bg-accent-lime-dim text-accent-lime',
  warning: 'border-warning/35 bg-warning-dim text-warning',
  danger: 'border-danger/35 bg-danger-dim text-danger',
  muted: 'border-white/10 bg-surface-2 text-text-secondary'
};

export function StatusBadge({ label, variant = 'muted', className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center rounded-full border px-2.5 py-1 font-manrope text-[10px] font-bold uppercase tracking-[0.16em]',
        variantStyles[variant],
        className
      )}
    >
      {label}
    </span>
  );
}

export default StatusBadge;
