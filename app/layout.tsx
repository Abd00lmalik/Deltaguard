import type { Metadata } from 'next';
import { Manrope, Sora } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';

const sora = Sora({ subsets: ['latin'], variable: '--font-sora' });
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope' });

export const metadata: Metadata = {
  title: 'DeltaGuard AI',
  description: 'A signal-to-execution hedge fund agent for on-chain investors.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sora.variable} ${manrope.variable}`}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
