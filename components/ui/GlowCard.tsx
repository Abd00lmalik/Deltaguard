'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils/cn';
import { useReducedMotionPreference } from '@/lib/utils/use-reduced-motion';

interface GlowCardProps extends HTMLMotionProps<'div'> {
  glowing?: boolean;
}

export function GlowCard({ children, className, glowing = false, style, ...props }: GlowCardProps) {
  const reducedMotion = useReducedMotionPreference();
  const ambientStyle = glowing
    ? {
        backgroundImage: 'var(--grad-card-ambient)',
        backgroundBlendMode: 'overlay' as const,
        ...style
      }
    : style;

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 14 }}
      animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.3, ease: 'easeOut' }}
      whileHover={reducedMotion ? undefined : { y: -2, transition: { duration: 0.18, ease: 'easeOut' } }}
      className={cn(
        'rounded-2xl border border-border-subtle bg-surface-1 shadow-card transition-colors duration-200',
        'hover:border-border-active',
        glowing && 'border-border-active shadow-[inset_0_0_40px_rgba(156,255,0,0.04),0_0_60px_rgba(156,255,0,0.05)]',
        className
      )}
      style={ambientStyle}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export default GlowCard;
