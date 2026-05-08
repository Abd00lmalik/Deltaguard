'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { MOCK_SIGNALS } from '@/lib/mock/signals';
import { SignalCard } from './SignalCard';
import { staggerContainer, staggerItem } from '@/lib/utils/motion';

export function SignalFeed() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.div
      ref={ref}
      className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
      variants={staggerContainer}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
    >
      {MOCK_SIGNALS.map((signal) => (
        <motion.div key={signal.id} variants={staggerItem}>
          <SignalCard signal={signal} />
        </motion.div>
      ))}
    </motion.div>
  );
}

export default SignalFeed;
