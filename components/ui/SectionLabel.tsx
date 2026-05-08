import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

interface SectionLabelProps {
  children: ReactNode;
  className?: string;
}

export function SectionLabel({ children, className }: SectionLabelProps) {
  return (
    <p
      className={cn(
        'font-manrope text-[11px] font-bold uppercase tracking-[0.24em] text-accent-lime',
        className
      )}
    >
      {children}
    </p>
  );
}

export default SectionLabel;
