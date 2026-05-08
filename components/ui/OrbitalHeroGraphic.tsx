'use client';

import { motion } from 'framer-motion';
import { Activity, Brain, Cpu, Gauge, Network, Shield, TrendingDown, Zap } from 'lucide-react';
import { useReducedMotionPreference } from '@/lib/utils/use-reduced-motion';

const nodes = [
  { label: 'BTC', icon: TrendingDown, className: 'left-[50%] top-[4%] -translate-x-1/2' },
  { label: 'ETH', icon: Network, className: 'right-[7%] top-[22%]' },
  { label: 'SSI', icon: Gauge, className: 'right-[9%] bottom-[23%]' },
  { label: 'SoDEX', icon: Zap, className: 'bottom-[5%] left-[50%] -translate-x-1/2' },
  { label: 'Signal', icon: Activity, className: 'bottom-[23%] left-[7%]' },
  { label: 'AI', icon: Brain, className: 'left-[5%] top-[24%]' },
  { label: 'Risk', icon: Cpu, className: 'left-[30%] top-[11%]' },
  { label: 'Hedge', icon: Shield, className: 'right-[29%] bottom-[11%]' }
];

export function OrbitalHeroGraphic() {
  const reducedMotion = useReducedMotionPreference();

  return (
    <div className="relative h-[360px] w-[360px] sm:h-[480px] sm:w-[480px]">
      <motion.div
        className="absolute inset-[18%] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(156,255,0,0.18)_0%,transparent_68%)]"
        animate={reducedMotion ? undefined : { scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      {[0, 1, 2].map((ring) => (
        <motion.div
          key={ring}
          className="absolute rounded-full border border-accent-lime/15"
          style={{
            inset: `${8 + ring * 12}%`
          }}
          animate={reducedMotion ? undefined : { rotate: ring === 1 ? -360 : 360 }}
          transition={{
            duration: ring === 0 ? 80 : ring === 1 ? 55 : 35,
            repeat: Infinity,
            ease: 'linear'
          }}
        >
          <span className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-accent-lime glow-lime" />
        </motion.div>
      ))}
      <div className="absolute left-1/2 top-1/2 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-accent-lime/30 bg-accent-lime-dim shadow-[0_0_80px_rgba(156,255,0,0.18)]">
        <div className="h-9 w-9 rotate-45 border-l-2 border-t-2 border-accent-lime glow-lime" />
      </div>
      {nodes.map((node, index) => {
        const Icon = node.icon;
        return (
          <motion.div
            key={node.label}
            className={`absolute flex items-center gap-2 rounded-full border border-white/10 bg-surface-1/90 px-3 py-2 shadow-card backdrop-blur ${node.className}`}
            animate={reducedMotion ? undefined : { y: [0, -6, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: index * 0.4 }}
          >
            <Icon className="h-3.5 w-3.5 text-accent-lime" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-white">
              {node.label}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

export default OrbitalHeroGraphic;
