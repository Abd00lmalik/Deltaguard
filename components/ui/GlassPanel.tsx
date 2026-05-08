import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
}

export function GlassPanel({ children, className }: GlassPanelProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/10 bg-white/[0.035] shadow-card backdrop-blur-xl',
        className
      )}
    >
      {children}
    </div>
  );
}

export default GlassPanel;
