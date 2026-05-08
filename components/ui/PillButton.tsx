'use client';

import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils/cn';
import { useReducedMotionPreference } from '@/lib/utils/use-reduced-motion';

type PillButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type PillButtonSize = 'sm' | 'md' | 'lg';

interface PillButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: PillButtonVariant;
  size?: PillButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
}

const variantStyles: Record<PillButtonVariant, string> = {
  primary:
    'bg-accent-lime text-black font-bold hover:shadow-[0_0_20px_rgba(156,255,0,0.4)] disabled:hover:shadow-none',
  secondary:
    'border border-border-subtle bg-surface-2 text-white hover:border-border-active hover:bg-accent-lime-dim',
  ghost: 'text-text-secondary hover:bg-white/5 hover:text-white',
  danger:
    'border border-danger/40 bg-danger-dim text-danger hover:bg-danger hover:text-black hover:shadow-[0_0_18px_rgba(255,68,68,0.25)]'
};

const sizeStyles: Record<PillButtonSize, string> = {
  sm: 'h-9 px-4 text-xs',
  md: 'h-11 px-5 text-sm',
  lg: 'h-13 px-7 py-4 text-base'
};

export function PillButton({
  children,
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  disabled,
  ...props
}: PillButtonProps) {
  const reducedMotion = useReducedMotionPreference();
  const isDisabled = disabled || loading;
  const hoverMotion =
    isDisabled || reducedMotion
      ? undefined
      : variant === 'primary'
        ? { scale: 1.03, boxShadow: '0 0 22px rgba(156,255,0,0.4)' }
        : { scale: 1.03 };

  return (
    <motion.button
      whileHover={hoverMotion}
      whileTap={isDisabled || reducedMotion ? undefined : { scale: 0.96 }}
      transition={{ duration: reducedMotion ? 0 : 0.15 }}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-manrope transition-all duration-200',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-lime',
        'disabled:cursor-not-allowed disabled:opacity-55',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      disabled={isDisabled}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </motion.button>
  );
}

export default PillButton;
