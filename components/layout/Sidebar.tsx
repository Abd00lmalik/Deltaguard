'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Activity,
  Brain,
  Layers,
  LayoutDashboard,
  Settings,
  TrendingDown,
  Wallet,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useReducedMotionPreference } from '@/lib/utils/use-reduced-motion';
import { useNetwork } from '@/lib/store/network-context';



function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-5 w-5">
        <div className="absolute inset-x-0 bottom-0 mx-auto h-0 w-0 border-b-[18px] border-l-[10px] border-r-[10px] border-b-accent-lime border-l-transparent border-r-transparent glow-lime" />
      </div>
      <p className="font-sora text-base font-bold text-white">
        DeltaGuard <span className="text-accent-lime">AI</span>
      </p>
    </div>
  );
}

export interface SidebarProps {
  mode?: 'demo' | 'live';
}

export function Sidebar({ mode = 'demo' }: SidebarProps) {
  const pathname = usePathname();
  const reducedMotion = useReducedMotionPreference();
  const { isTestnet, networkLabel } = useNetwork();
  const prefix = mode === 'demo' ? '/demo' : '/terminal';

  const navItems = [
    { label: 'Dashboard', href: `${prefix}/dashboard`, icon: LayoutDashboard },
    { label: 'Portfolio', href: `${prefix}/portfolio`, icon: Wallet },
    { label: 'Signals', href: `${prefix}/signals`, icon: Activity },
    { label: 'Agent', href: `${prefix}/agent`, icon: Brain },
    { label: 'Execution', href: `${prefix}/execution`, icon: Zap },
    ...(mode === 'demo' ? [{ label: 'Stress Test', href: `${prefix}/stress-test`, icon: TrendingDown }] : []),
    { label: 'Architecture', href: '/integrations', icon: Layers },
    { label: 'Settings', href: `${prefix}/settings`, icon: Settings }
  ];

  return (
    <>
      <aside className="fixed bottom-0 left-0 top-0 z-40 hidden w-[240px] flex-col border-r border-border-subtle bg-surface-1 lg:flex">
        <div className="px-5 py-6">
          <Logo />
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <motion.div
                key={item.href}
                whileHover={reducedMotion || active ? undefined : { backgroundColor: 'rgba(255,255,255,0.04)' }}
                transition={{ duration: reducedMotion ? 0 : 0.15 }}
                className="rounded-xl"
              >
                <Link
                  href={item.href}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 font-manrope text-sm transition-all duration-150',
                    active
                      ? 'bg-accent-lime-dim font-medium text-accent-lime'
                      : 'font-normal text-text-muted hover:text-text-secondary'
                  )}
                >
                  <Icon className={cn('h-4 w-4', active ? 'text-accent-lime' : 'text-text-muted')} />
                  {item.label}
                </Link>
              </motion.div>
            );
          })}
        </nav>
        <div className="px-5 py-5 border-t border-border-subtle/30 flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className={cn(
              "relative flex h-2 w-2",
            )}>
              <span className={cn(
                "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                mode === 'demo' ? "bg-amber-400" : isTestnet ? "bg-amber-400" : "bg-accent-lime"
              )}></span>
              <span className={cn(
                "relative inline-flex rounded-full h-2 w-2",
                mode === 'demo' ? "bg-amber-500" : isTestnet ? "bg-amber-500" : "bg-accent-lime"
              )}></span>
            </span>
            <p className="font-manrope text-[11px] font-semibold text-text-secondary">
              {mode === 'demo' ? 'Prototype Environment' : networkLabel}
            </p>
          </div>
          <p className="font-manrope text-[10px] text-text-muted">v1.0.0</p>
        </div>
      </aside>

      <nav className="fixed bottom-0 left-0 right-0 z-40 flex gap-1 overflow-x-auto border-t border-border-subtle bg-surface-1/95 px-2 py-2 backdrop-blur-xl lg:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className={cn(
                'flex min-w-14 flex-col items-center gap-1 rounded-xl px-3 py-2 font-manrope text-[10px]',
                active ? 'bg-accent-lime-dim text-accent-lime' : 'text-text-muted'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label.split(' ')[0]}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export default Sidebar;
