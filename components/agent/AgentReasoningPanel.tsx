import type { ReactNode } from 'react';
import { GlowCard } from '@/components/ui/GlowCard';

export function AgentReasoningPanel({ children }: { children: ReactNode }) {
  return <GlowCard className="p-5">{children}</GlowCard>;
}

export default AgentReasoningPanel;
