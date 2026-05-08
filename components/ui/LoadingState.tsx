'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Activity, Cpu, ShieldCheck, Sparkles } from 'lucide-react';
import { GlowCard } from './GlowCard';
import { cn } from '@/lib/utils/cn';
import { useReducedMotionPreference } from '@/lib/utils/use-reduced-motion';

interface LoadingStateProps {
  messages?: string[];
  activeIndex?: number;
}

const defaultMessages = [
  'Fetching market signals...',
  'Calculating portfolio delta...',
  'Running agent decision engine...',
  'Generating hedge recommendation...'
];

const icons = [Activity, Cpu, Sparkles, ShieldCheck];

export function LoadingState({ messages = defaultMessages, activeIndex = 0 }: LoadingStateProps) {
  const reducedMotion = useReducedMotionPreference();
  const currentMessage = messages[activeIndex] ?? messages[0];

  return (
    <GlowCard glowing className="p-8">
      <div className="flex flex-col items-center text-center">
        <div className="relative h-16 w-16 rounded-full border border-accent-lime/20 bg-accent-lime-dim">
          <div className="absolute inset-2 rounded-full border border-accent-lime/25" />
          <motion.div
            className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full bg-accent-lime glow-lime"
            animate={reducedMotion ? undefined : { scale: [1, 1.8, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            style={{ translateX: '-50%', translateY: '-50%' }}
          />
        </div>
        <h2 className="mt-5 font-sora text-xl font-bold text-white">Running Agent Scan</h2>
        <AnimatePresence mode="wait">
          <motion.p
            key={currentMessage}
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: reducedMotion ? 0 : 0.3 }}
            className="mt-2 font-manrope text-sm text-text-secondary"
          >
            {currentMessage}
            <span className="ml-2 inline-flex align-middle">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="mx-0.5 inline-block h-1.5 w-1.5 rounded-full bg-accent-lime"
                  animate={reducedMotion ? undefined : { opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </span>
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="mt-8 space-y-3">
        {messages.map((message, index) => {
          const Icon = icons[index % icons.length];
          const isActive = index === activeIndex;
          const isDone = index < activeIndex;
          return (
            <div
              key={message}
              className={cn(
                'flex items-center gap-3 rounded-xl border px-4 py-3 transition-all',
                isActive && 'border-accent-lime/25 bg-accent-lime-dim text-white',
                isDone && 'border-accent-lime/15 bg-white/[0.03] text-text-secondary',
                !isActive && !isDone && 'border-white/5 bg-white/[0.02] text-text-muted'
              )}
            >
              <Icon className={cn('h-4 w-4', isActive ? 'text-accent-lime' : 'text-text-muted')} />
              <span className="font-manrope text-sm">{message}</span>
              {isActive ? (
                <span className="ml-auto flex gap-1">
                  {[0, 1, 2].map((dot) => (
                    <motion.span
                      key={dot}
                      className="h-1.5 w-1.5 rounded-full bg-accent-lime"
                      animate={reducedMotion ? undefined : { opacity: [0.25, 1, 0.25] }}
                      transition={{ duration: 0.9, repeat: Infinity, delay: dot * 0.15 }}
                    />
                  ))}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </GlowCard>
  );
}

export default LoadingState;
