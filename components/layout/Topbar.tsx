import type { ReactNode } from 'react';
import { MOCK_COMPOSITE_SCORE } from '@/lib/mock/signals';
import { cn } from '@/lib/utils/cn';

interface TopbarProps {
  title: string;
  action?: ReactNode;
}

const regimeStyles = {
  'risk-off': 'border-warning/35 bg-warning-dim text-warning',
  caution: 'border-warning/20 bg-warning-dim text-warning',
  neutral: 'border-white/10 bg-white/5 text-text-secondary',
  'risk-on': 'border-accent-lime/30 bg-accent-lime-dim text-accent-lime'
};

export function Topbar({ title, action }: TopbarProps) {
  const composite = MOCK_COMPOSITE_SCORE;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center border-b border-border-subtle bg-surface-1 px-4 sm:px-6 lg:px-8">
      <div className="min-w-0 flex-1">
        <p className="truncate font-sora text-[15px] font-semibold text-white">{title}</p>
      </div>
      <div
        className={cn(
          'hidden rounded-full border px-3 py-1 font-manrope text-[10px] font-bold uppercase tracking-[0.16em] sm:inline-flex',
          regimeStyles[composite.regime]
        )}
      >
        {composite.label}
      </div>
      <div className="ml-auto flex items-center gap-3 pl-4">{action}</div>
    </header>
  );
}

export default Topbar;
