'use client';

import { motion, useInView, type Variants } from 'framer-motion';
import { useRef } from 'react';
import { fadeUp } from '@/lib/utils/motion';
import { useReducedMotionPreference } from '@/lib/utils/use-reduced-motion';

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  variants?: Variants;
}

const reducedVariants: Variants = {
  hidden: { opacity: 1, y: 0, x: 0, scale: 1 },
  visible: { opacity: 1, y: 0, x: 0, scale: 1, transition: { duration: 0 } }
};

export function ScrollReveal({ children, className, delay = 0, variants }: ScrollRevealProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  const reducedMotion = useReducedMotionPreference();

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={reducedMotion ? reducedVariants : (variants ?? fadeUp)}
      transition={{ delay: reducedMotion ? 0 : delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
