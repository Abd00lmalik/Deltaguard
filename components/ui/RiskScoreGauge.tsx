'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils/cn';
import { clamp } from '@/lib/utils/format';
import { useReducedMotionPreference } from '@/lib/utils/use-reduced-motion';

interface RiskScoreGaugeProps {
  score: number;
  label?: string;
  min?: number;
  max?: number;
  className?: string;
}

export function RiskScoreGauge({ score, label, min = 0, max = 100, className }: RiskScoreGaugeProps) {
  const reducedMotion = useReducedMotionPreference();
  const progress = clamp(((score - min) / (max - min)) * 100, 0, 100);
  const danger = score < -50 || score >= 70;
  const warning = !danger && (score < 20 || score >= 45);
  const stroke = danger ? '#FF4444' : warning ? '#F59E0B' : '#9CFF00';
  const angle = -180 + progress * 1.8;

  return (
    <div className={cn('rounded-2xl border border-border-subtle bg-surface-1 p-5', className)}>
      <div className="relative mx-auto h-36 max-w-[280px]">
        <svg viewBox="0 0 240 140" className="h-full w-full overflow-visible">
          <path
            d="M 24 120 A 96 96 0 0 1 216 120"
            pathLength={100}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={14}
            strokeLinecap="round"
          />
          <motion.path
            d="M 24 120 A 96 96 0 0 1 216 120"
            pathLength={100}
            fill="none"
            stroke={stroke}
            strokeWidth={14}
            strokeLinecap="round"
            strokeDasharray={100}
            initial={{ strokeDashoffset: reducedMotion ? 100 - progress : 100 }}
            animate={{ strokeDashoffset: 100 - progress }}
            transition={{ duration: reducedMotion ? 0 : 0.9, ease: [0.22, 1, 0.36, 1] }}
            className={danger ? 'glow-danger' : 'glow-lime'}
          />
          <g style={{ transformOrigin: '120px 120px', transform: `rotate(${angle}deg)` }}>
            <line x1="120" y1="120" x2="120" y2="40" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
            <circle cx="120" cy="120" r="6" fill={stroke} />
          </g>
        </svg>
        <div className="absolute bottom-0 left-0 right-0 text-center">
          <p className="font-sora text-4xl font-bold text-white">{score}</p>
          <p className="mt-1 font-manrope text-[11px] font-bold uppercase tracking-[0.18em] text-text-secondary">
            {label ?? 'Risk Score'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default RiskScoreGauge;
