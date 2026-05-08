import { CheckCheck, Clock3 } from 'lucide-react';
import { motion } from 'framer-motion';
import type { OrderTimelineStep } from '@/types/execution';
import { GlowCard } from '@/components/ui/GlowCard';
import { cn } from '@/lib/utils/cn';

interface ExecutionTimelineProps {
  steps: OrderTimelineStep[];
  preview?: boolean;
}

export function ExecutionTimeline({ steps, preview = false }: ExecutionTimelineProps) {
  const visibleSteps = preview ? steps.slice(0, 4) : steps;
  const cleanDescription = (description: string) =>
    description
      .replace('Submitted to simulated SoDEX order gateway.', 'Routed to SoDEX order gateway.')
      .replace('Filled at simulated market price with modeled slippage.', 'Filled at market price with modeled slippage.')
      .replace('simulated SoDEX', 'SoDEX')
      .replace('simulated market', 'market')
      .replace('demo state', 'portfolio state');

  return (
    <GlowCard className="p-5">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h3 className="font-sora text-base font-bold text-white">Execution Log</h3>
        {preview ? <span className="font-manrope text-xs text-text-muted">Latest steps</span> : null}
      </div>
      <div className="space-y-0">
        {visibleSteps.map((step, index) => {
          const complete = step.status === 'complete';
          const active = step.status === 'active';
          return (
            <motion.div
              key={`${step.step}-${step.status}`}
              className="relative flex gap-4 pb-6 last:pb-0"
              initial={step.status === 'pending' ? false : { opacity: 0.3, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35 }}
            >
              {index < visibleSteps.length - 1 ? (
                <motion.div
                  className={cn(
                    'absolute left-[15px] top-8 h-[calc(100%-32px)] w-px',
                    complete ? 'bg-accent-lime/45' : 'bg-white/10'
                  )}
                  initial={complete ? { height: 0 } : false}
                  animate={complete ? { height: 'calc(100% - 32px)' } : undefined}
                  transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
                />
              ) : null}
              <div
                className={cn(
                  'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border',
                  complete && 'border-accent-lime bg-accent-lime text-black',
                  active && 'animate-pulse border-warning bg-warning-dim text-warning',
                  !complete && !active && 'border-white/10 bg-white/[0.03] text-text-muted'
                )}
              >
                {complete ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    <CheckCheck className="h-4 w-4" />
                  </motion.div>
                ) : (
                  <Clock3 className="h-4 w-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p
                    className={cn(
                      'font-sora text-sm font-bold',
                      complete && 'text-accent-lime',
                      active && 'text-warning',
                      !complete && !active && 'text-text-secondary'
                    )}
                  >
                    {step.label}
                  </p>
                  <span className="font-mono text-[11px] text-text-muted">
                    {step.timestamp ? new Date(step.timestamp).toLocaleTimeString() : active ? 'In progress...' : 'Pending'}
                  </span>
                </div>
                <p className="mt-1 font-manrope text-xs leading-5 text-text-muted">{cleanDescription(step.description)}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </GlowCard>
  );
}

export default ExecutionTimeline;
