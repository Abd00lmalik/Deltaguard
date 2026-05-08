'use client';

import type { ReactNode } from 'react';
import { Search } from 'lucide-react';
import { GlowCard } from './GlowCard';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <GlowCard className="flex min-h-[320px] flex-col items-center justify-center p-8 text-center">
      <div className="mb-5 rounded-full border border-accent-lime/20 bg-accent-lime-dim p-4 text-accent-lime">
        <Search className="h-7 w-7" />
      </div>
      <h2 className="font-sora text-2xl font-bold text-white">{title}</h2>
      <p className="mt-3 max-w-md font-manrope text-sm leading-6 text-text-secondary">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </GlowCard>
  );
}

export default EmptyState;
