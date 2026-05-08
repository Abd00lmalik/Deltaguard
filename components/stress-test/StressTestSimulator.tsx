import type { ReactNode } from 'react';

export function StressTestSimulator({ children }: { children: ReactNode }) {
  return <div className="space-y-6">{children}</div>;
}

export default StressTestSimulator;
