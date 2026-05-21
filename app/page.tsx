'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  Brain,
  Cpu,
  Eye,
  ScanLine,
  ShieldCheck,
  Zap
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { GlowCard } from '@/components/ui/GlowCard';
import { OrbitalHeroGraphic } from '@/components/ui/OrbitalHeroGraphic';
import { PillButton } from '@/components/ui/PillButton';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TerminalPreview } from '@/components/ui/TerminalPreview';
import { glowPulse, scaleIn, slideInLeft, staggerContainer, staggerItem, wordDrop } from '@/lib/utils/motion';
import { useReducedMotionPreference } from '@/lib/utils/use-reduced-motion';

const stressPreviewData = [
  { t: 'T+0', unhedged: 125357, hedged: 125357 },
  { t: 'T+1', unhedged: 118000, hedged: 121000 },
  { t: 'T+2', unhedged: 108000, hedged: 116000 },
  { t: 'T+3', unhedged: 92000, hedged: 110000 },
  { t: 'T+4', unhedged: 78000, hedged: 105000 },
  { t: 'T+5', unhedged: 65000, hedged: 101000 },
  { t: 'T+6', unhedged: 61200, hedged: 102500 },
  { t: 'T+7', unhedged: 68000, hedged: 106000 },
  { t: 'T+8', unhedged: 74000, hedged: 109000 }
];

const integrations = [
  {
    name: 'SoSoValue Intelligence Layer',
    description: 'Market signals, ETF flows, macro events, and AI-generated market context.'
  },
  {
    name: 'SSI Portfolio Layer',
    description: 'Index-style holdings, exposure tracking, and portfolio composition data.'
  },
  {
    name: 'SoDEX Execution Layer',
    description: 'High-performance orderbook execution for hedge positions.'
  },
  {
    name: 'ValueChain Settlement Layer',
    description: 'On-chain position verification and settlement confirmation.'
  },
  {
    name: 'Agent Risk Engine',
    description: 'Transparent, rule-based reasoning that explains every decision step.'
  }
];

const howItWorksCards: {
  icon: LucideIcon;
  title: string;
  body: string;
  pill: string;
}[] = [
  {
    icon: Eye,
    title: 'Watch the Market',
    body: "DeltaGuard follows market signals, news, liquidity, volatility, and how your assets are moving, so you don't have to stare at charts all day.",
    pill: '9 Signals Tracked'
  },
  {
    icon: ScanLine,
    title: 'Understand Your Risk',
    body: "The agent checks your portfolio and tells you where you are exposed. If the market moves against you, you'll see it before it hurts.",
    pill: 'Risk Calculated'
  },
  {
    icon: ShieldCheck,
    title: 'Protect Before Damage',
    body: 'When risk gets serious, DeltaGuard suggests a hedge and shows you exactly why. Nothing happens without your approval.',
    pill: 'You Stay in Control'
  }
];

const workflowNodes: { icon: LucideIcon; label: string; sublabel: string }[] = [
  { icon: Activity, label: 'SoSoValue Signal Feed', sublabel: '9 risk inputs' },
  { icon: Cpu, label: 'Risk Engine', sublabel: 'Delta + stress' },
  { icon: Brain, label: 'Agent Reasoning', sublabel: 'Transparent rules' },
  { icon: Eye, label: 'You Approve', sublabel: 'Manual only' },
  { icon: Zap, label: 'SoDEX Execution', sublabel: 'Order receipt' }
];

function LogoMark() {
  return (
    <div className="relative h-4 w-4">
      <div className="absolute inset-x-0 bottom-0 mx-auto h-0 w-0 border-b-[15px] border-l-[8px] border-r-[8px] border-b-accent-lime border-l-transparent border-r-transparent glow-lime" />
    </div>
  );
}

const headlineLine1 = ['Your', 'Personal'];
const headlineLine2 = ['Hedge', 'Fund', 'Agent'];

function AnimatedHeadline() {
  const reducedMotion = useReducedMotionPreference();
  let wordIndex = 0;

  const renderWord = (word: string, lime: boolean) => {
    const delay = 0.1 + wordIndex++ * 0.07;
    const className = `mr-[0.25em] inline-block ${lime ? 'text-accent-lime glow-lime' : ''}`;

    if (reducedMotion) {
      return (
        <span key={word + delay} className={className}>
          {word}
        </span>
      );
    }

    return (
      <motion.span
        key={word + delay}
        className={className}
        style={{ perspective: 600 }}
        initial="hidden"
        animate="visible"
        variants={wordDrop(delay)}
      >
        {word}
      </motion.span>
    );
  };

  return (
    <h1 className="mt-5 max-w-5xl font-sora text-[42px] font-extrabold leading-[1.05] tracking-normal text-white sm:text-6xl lg:text-7xl">
      <span className="block overflow-hidden">
        {headlineLine1.map((word) => renderWord(word, false))}
      </span>
      <span className="block overflow-hidden">
        {headlineLine2.map((word) => renderWord(word, true))}
      </span>
    </h1>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const reducedMotion = useReducedMotionPreference();

  return (
    <main className="min-h-screen bg-background text-white">
      <nav className="fixed left-1/2 top-5 z-50 flex -translate-x-1/2 items-center gap-4 rounded-full border border-white/[0.08] bg-surface-1/85 px-4 py-2.5 shadow-card backdrop-blur-xl sm:gap-8 sm:px-5">
        <button onClick={() => router.push('/')} className="flex items-center gap-2">
          <LogoMark />
          <span className="whitespace-nowrap font-sora text-sm font-bold">DeltaGuard AI</span>
        </button>
        <div className="hidden items-center gap-5 md:flex">
          {[
            ['Features', '#features'],
            ['How It Works', '#how-it-works'],
            ['Stress Test', '#stress-test'],
            ['Integrations', '#integrations']
          ].map(([label, href]) => (
            <a key={label} href={href} className="font-manrope text-[13px] text-text-secondary transition-colors hover:text-white">
              {label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <PillButton size="sm" variant="secondary" onClick={() => window.open('https://github.com/', '_blank')}>
            GitHub -&gt;
          </PillButton>
          <PillButton size="sm" onClick={() => router.push('/terminal')}>
            Open Terminal
          </PillButton>
        </div>
      </nav>

      <section className="terminal-noise relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 pb-20 pt-32 text-center">
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(180deg, #040a04 0%, #030303 40%, #030303 100%)' }}
          />
          <div className="absolute inset-0" style={{ background: 'var(--grad-hero)' }} />
          <motion.div
            variants={reducedMotion ? undefined : glowPulse}
            animate={reducedMotion ? undefined : 'animate'}
            style={{
              position: 'absolute',
              width: 500,
              height: 500,
              borderRadius: '50%',
              background: 'radial-gradient(ellipse, rgba(156,255,0,0.07) 0%, transparent 70%)',
              left: '50%',
              top: '45%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none'
            }}
          />
        </div>
        <div className="relative z-10 flex max-w-6xl flex-col items-center">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.45, delay: reducedMotion ? 0 : 0.05 }}
          >
            <SectionLabel className="mt-8">Signal to Execution</SectionLabel>
          </motion.div>
          <AnimatedHeadline />
          <motion.p
            initial={reducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.5, delay: reducedMotion ? 0 : 0.75 }}
            className="mt-6 max-w-xl font-manrope text-[17px] leading-8 text-text-secondary"
          >
            DeltaGuard AI reads SoSoValue-style market signals, calculates portfolio delta exposure, and prepares
            hedging actions before volatility damages your portfolio.
          </motion.p>
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.5, delay: reducedMotion ? 0 : 0.95 }}
            className="mt-10 grid gap-6 sm:grid-cols-2 max-w-2xl w-full"
          >
            <div className="group relative rounded-2xl border border-accent-lime/10 bg-surface-1/40 p-6 text-left backdrop-blur-sm transition-all hover:border-accent-lime/30 hover:bg-surface-1/60">
              <div className="absolute top-4 right-4 rounded-full bg-accent-lime/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-accent-lime">Live Testnet</div>
              <h3 className="font-sora text-lg font-bold text-white flex items-center gap-2">
                Live Terminal <ArrowRight className="h-4 w-4 text-accent-lime transition-transform group-hover:translate-x-1" />
              </h3>
              <p className="mt-2 font-manrope text-xs text-text-secondary leading-relaxed">
                Connect real credentials for SoSoValue, SSI Protocol, and SoDEX. Validates environments and runs live testnet orders.
              </p>
              <PillButton size="sm" className="mt-4 w-full justify-center" onClick={() => router.push('/terminal')}>
                Enter Live Terminal
              </PillButton>
            </div>

            <div className="group relative rounded-2xl border border-amber-500/10 bg-surface-1/40 p-6 text-left backdrop-blur-sm transition-all hover:border-amber-500/30 hover:bg-surface-1/60">
              <div className="absolute top-4 right-4 rounded-full bg-amber-500/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-amber-400">Prototype</div>
              <h3 className="font-sora text-lg font-bold text-white flex items-center gap-2">
                Demo Sandbox <ArrowRight className="h-4 w-4 text-amber-400 transition-transform group-hover:translate-x-1" />
              </h3>
              <p className="mt-2 font-manrope text-xs text-text-secondary leading-relaxed">
                Explore the guided DeltaGuard risk-hedging workflow with deterministic, zero-configuration simulated environments.
              </p>
              <PillButton size="sm" variant="secondary" className="mt-4 w-full justify-center border-amber-500/20 hover:border-amber-500/40 text-amber-400 hover:text-white" onClick={() => router.push('/demo')}>
                Enter Demo Sandbox
              </PillButton>
            </div>
          </motion.div>
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: reducedMotion ? 0 : 0.6, delay: reducedMotion ? 0 : 1 }}
            className="mt-6"
          >
            <OrbitalHeroGraphic />
          </motion.div>
        </div>
      </section>

      <section
        id="features"
        className="px-6 py-24"
        style={{ background: '#050505', backgroundImage: 'var(--grad-section-alt)' }}
      >
        <div className="mx-auto max-w-6xl text-center">
          <ScrollReveal>
            <SectionLabel>Command Center Preview</SectionLabel>
            <h2 className="mt-4 font-sora text-4xl font-bold text-white">The Institutional Workflow. For Individuals.</h2>
          </ScrollReveal>
          <ScrollReveal>
            <GlowCard className="mx-auto mt-10 max-w-5xl rounded-3xl p-6 sm:p-8" glowing>
              <TerminalPreview />
            </GlowCard>
          </ScrollReveal>
        </div>
      </section>

      <section
        id="how-it-works"
        className="px-6 py-24"
        style={{ background: 'linear-gradient(180deg, #030303 0%, #040b04 50%, #030303 100%)' }}
      >
        <div className="mx-auto max-w-6xl text-center">
          <ScrollReveal>
            <SectionLabel>How It Works</SectionLabel>
            <h2 className="mt-4 font-sora text-4xl font-bold text-white">Simple Enough to Understand. Serious Enough to Trust.</h2>
          </ScrollReveal>
          <motion.div
            className="mt-10 grid gap-5 md:grid-cols-3"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
          >
            {howItWorksCards.map(({ icon: Icon, title, body, pill }) => (
              <motion.div
                key={title}
                variants={staggerItem}
                whileHover={reducedMotion ? undefined : { y: -4, transition: { duration: 0.2 } }}
              >
                <GlowCard className="h-full p-6 text-left">
                  <Icon className="h-7 w-7 text-accent-lime" />
                  <h3 className="mt-6 font-sora text-xl font-bold text-white">{title}</h3>
                  <p className="mt-3 font-manrope text-sm leading-6 text-text-secondary">{body}</p>
                  <StatusBadge className="mt-6" variant={pill.includes('Control') ? 'warning' : 'signal'} label={pill} />
                </GlowCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section
        id="workflow"
        className="px-6 py-24"
        style={{ background: '#050505', backgroundImage: 'var(--grad-section-alt)' }}
      >
        <div className="mx-auto max-w-6xl text-center">
          <ScrollReveal>
            <SectionLabel>Agent Workflow</SectionLabel>
            <h2 className="mt-4 font-sora text-4xl font-bold text-white">Signal to Execution. Transparently.</h2>
          </ScrollReveal>
          <div className="mt-10 flex flex-col items-stretch justify-center gap-4 lg:flex-row lg:items-center">
            {workflowNodes.map(({ icon: Icon, label, sublabel }, index, arr) => (
              <div key={label} className="contents lg:flex lg:items-center lg:gap-4">
                <ScrollReveal delay={index * 0.1} variants={slideInLeft} className="min-w-0 flex-1">
                  <GlowCard className="p-4">
                    <Icon className="mx-auto h-5 w-5 text-accent-lime" />
                    <p className="mt-3 font-sora text-sm font-bold text-white">{label}</p>
                    <p className="mt-1 font-manrope text-[11px] text-text-muted">{sublabel}</p>
                  </GlowCard>
                </ScrollReveal>
                {index < arr.length - 1 ? (
                  <motion.div
                    className="hidden h-px w-10 origin-left border-t border-dashed border-accent-lime/60 lg:block"
                    initial={reducedMotion ? false : { scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: reducedMotion ? 0 : 0.4, ease: 'easeOut', delay: index * 0.1 + 0.1 }}
                  />
                ) : null}
              </div>
            ))}
          </div>
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {['9 Signals Analyzed', '83% Confidence', '35% Exposure Hedged'].map((fact) => (
              <div key={fact} className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-3 font-sora text-sm font-bold text-white">
                {fact}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="stress-test" className="bg-background px-6 py-24">
        <div className="mx-auto max-w-5xl text-center">
          <ScrollReveal>
            <SectionLabel>Portfolio Stress Test</SectionLabel>
            <h2 className="mt-4 font-sora text-4xl font-bold text-white">See the Hedge in Action</h2>
            <p className="mx-auto mt-4 max-w-xl font-manrope text-sm leading-6 text-text-secondary">
              Model a market crash and compare protected vs unprotected portfolio performance.
            </p>
          </ScrollReveal>
          <ScrollReveal variants={scaleIn}>
          <GlowCard className="mt-10 p-6 text-left" glowing>
            <div className="h-[280px] rounded-2xl bg-surface-1 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stressPreviewData}>
                  <defs>
                    <linearGradient id="landingUnhedged" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF4444" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#FF4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="landingHedged" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9CFF00" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#9CFF00" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="t" tickLine={false} axisLine={false} tick={{ fill: '#555', fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#555', fontSize: 11 }} width={58} />
                  <Tooltip contentStyle={{ background: '#0B0B0B', border: '1px solid rgba(255,255,255,0.08)' }} />
                  <Area dataKey="unhedged" stroke="#FF4444" fill="url(#landingUnhedged)" strokeWidth={2} />
                  <Area dataKey="hedged" stroke="#9CFF00" fill="url(#landingHedged)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <motion.div
                className="flex flex-wrap gap-2"
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                {[
                  { variant: 'danger' as const, label: 'Unhedged Drawdown: -51.3%' },
                  { variant: 'hedge' as const, label: 'Hedged Drawdown: -18.7%' },
                  { variant: 'muted' as const, label: 'Hedge Effectiveness: 63%' }
                ].map((badge) => (
                  <motion.div key={badge.label} variants={staggerItem}>
                    <StatusBadge variant={badge.variant} label={badge.label} />
                  </motion.div>
                ))}
              </motion.div>
              <PillButton onClick={() => router.push('/stress-test')}>Try Full Stress Test -&gt;</PillButton>
            </div>
          </GlowCard>
          </ScrollReveal>
        </div>
      </section>

      <section
        id="integrations"
        className="px-6 py-24"
        style={{ background: '#050505', backgroundImage: 'var(--grad-section-alt)' }}
      >
        <div className="mx-auto max-w-6xl text-center">
          <ScrollReveal>
            <SectionLabel>Data &amp; Execution Stack</SectionLabel>
            <h2 className="mt-4 font-sora text-4xl font-bold text-white">Built on a Layered Intelligence Stack</h2>
            <p className="mx-auto mt-4 max-w-2xl font-manrope text-sm leading-6 text-text-secondary">
              DeltaGuard connects market intelligence, portfolio tracking, AI reasoning, and execution into a single workflow.
            </p>
          </ScrollReveal>
          <motion.div
            className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
          >
            {integrations.map(({ name, description }) => (
              <motion.div
                key={name}
                variants={staggerItem}
                whileHover={reducedMotion ? undefined : { y: -3, transition: { duration: 0.2 } }}
              >
                <GlowCard className="h-full p-5 text-left">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-sora text-sm font-bold text-white">{name}</h3>
                    <StatusBadge variant="muted" label="Active" />
                  </div>
                  <p className="mt-4 font-manrope text-sm leading-6 text-text-secondary">{description}</p>
                </GlowCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section
        className="relative overflow-hidden px-6 py-28 text-center"
        style={{ background: '#030303', backgroundImage: 'var(--grad-cta)' }}
      >
        <div className="relative z-10 mx-auto max-w-3xl">
          <ScrollReveal>
            <SectionLabel>Get Started</SectionLabel>
            <h2 className="mt-4 font-sora text-5xl font-bold text-white">Build the Future of Personal Risk Management</h2>
            <p className="mx-auto mt-5 max-w-xl font-manrope text-base leading-7 text-text-secondary">
              Open the terminal and experience DeltaGuard AI&apos;s signal-to-execution workflow with fully structured portfolio data.
            </p>
          </ScrollReveal>
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: reducedMotion ? 0 : 0.45, delay: reducedMotion ? 0 : 0.2 }}
            whileHover={reducedMotion ? undefined : { scale: 1.03 }}
            whileTap={reducedMotion ? undefined : { scale: 0.97 }}
            className="mt-8 inline-flex"
          >
            <PillButton size="lg" icon={<ShieldCheck className="h-4 w-4" />} onClick={() => router.push('/dashboard')}>
              Open Terminal
            </PillButton>
          </motion.div>
          <p className="mt-6 font-manrope text-xs text-text-muted">
            DeltaGuard AI - Risk defense for on-chain portfolios.
          </p>
        </div>
      </section>

      <footer className="flex flex-col justify-between gap-2 border-t border-white/[0.06] bg-surface-1 px-6 py-8 font-manrope text-sm text-text-muted sm:flex-row">
        <span>DeltaGuard AI - Risk defense for on-chain portfolios.</span>
        <span>Built for SoSoValue Buildathon</span>
      </footer>
    </main>
  );
}
