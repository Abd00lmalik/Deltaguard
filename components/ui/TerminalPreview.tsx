'use client';

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { motion } from 'framer-motion';
import { StatusBadge } from './StatusBadge';
import { staggerContainer, staggerItem } from '@/lib/utils/motion';

const bars = [
  { name: 'BTC', value: 38 },
  { name: 'ETH', value: 25 },
  { name: 'MAG7', value: 15 },
  { name: 'MEME', value: 17 },
  { name: 'DeFi', value: 5 }
];

const metrics = [
  ['Portfolio Value', '$125,357.50', 'text-white'],
  ['Net Delta', '0.81', 'text-warning'],
  ['Signal Score', '-72', 'text-danger'],
  ['Hedge Coverage', '0%', 'text-white']
];

export function TerminalPreview() {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#070707] p-5">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="font-sora text-sm font-bold text-white">Command Center Snapshot</p>
          <p className="mt-1 font-manrope text-xs text-text-muted">Signal-to-execution terminal</p>
        </div>
        <StatusBadge variant="muted" label="Active Portfolio View" />
      </div>
      <motion.div className="grid gap-3 md:grid-cols-4" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}>
        {metrics.map(([label, value, color]) => (
          <motion.div key={label} variants={staggerItem} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <p className="font-manrope text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">
              {label}
            </p>
            <p className={`mt-2 font-sora text-xl font-bold ${color}`}>{value}</p>
          </motion.div>
        ))}
      </motion.div>
      <div className="mt-4 grid gap-4 md:grid-cols-[1.35fr_1fr]">
        <div className="rounded-2xl border border-white/8 bg-surface-1 p-4">
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={bars}>
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#555', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#0B0B0B', border: '1px solid rgba(255,255,255,0.08)' }}
                cursor={{ fill: 'rgba(156,255,0,0.05)' }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#9CFF00" opacity={0.82} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-3 rounded-2xl border border-white/8 bg-surface-1 p-4">
          {[
            ['ETF Flow Pressure', '-80', 'danger'],
            ['BTC Volatility Spike', '-74', 'danger'],
            ['News / Regime Alert', '-77', 'warning']
          ].map(([label, score, variant]) => (
            <div key={label} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-3 py-3">
              <span className="font-manrope text-xs text-text-secondary">{label}</span>
              <StatusBadge label={score} variant={variant === 'danger' ? 'danger' : 'warning'} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TerminalPreview;
