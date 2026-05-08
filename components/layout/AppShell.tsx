'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { useReducedMotionPreference } from '@/lib/utils/use-reduced-motion';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isLanding = pathname === '/';
  const reducedMotion = useReducedMotionPreference();

  if (isLanding) return <>{children}</>;

  return (
    <>
      <Sidebar />
      <AnimatePresence mode="wait">
        <motion.main
          key={pathname}
          initial={reducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? undefined : { opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.25, ease: 'easeOut' }}
          className="min-h-screen lg:ml-[240px]"
          style={{
            background: 'linear-gradient(160deg, #050905 0%, #030303 30%, #030303 100%)',
            minHeight: '100vh'
          }}
        >
          {children}
        </motion.main>
      </AnimatePresence>
    </>
  );
}

export default AppShell;
