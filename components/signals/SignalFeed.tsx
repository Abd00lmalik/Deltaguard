'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { MOCK_SIGNALS } from '@/lib/mock/signals';
import { SignalCard } from './SignalCard';
import { staggerContainer, staggerItem } from '@/lib/utils/motion';
import type { MarketSignal } from '@/types/signals';

interface SignalFeedProps {
  signals?: MarketSignal[];
}

export function SignalFeed({ signals }: SignalFeedProps) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const activeSignals = signals ?? MOCK_SIGNALS;

  return (
    <motion.div
      ref={ref}
      className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
      variants={staggerContainer}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
    >
      {activeSignals.map((signal) => (
        <motion.div key={signal.id} variants={staggerItem}>
          <SignalCard signal={signal} />
        </motion.div>
      ))}
    </motion.div>
  );
}

export default SignalFeed;
