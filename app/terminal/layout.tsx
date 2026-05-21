// DeltaGuard AI - Live Terminal Environment Shell Layout
import React from 'react';
import Sidebar from '@/components/layout/Sidebar';
import LiveStatusBar from '@/components/layout/LiveStatusBar';

export default function TerminalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#030303] overflow-hidden">
      <Sidebar mode="live" />
      <div className="flex flex-col flex-1 overflow-hidden lg:ml-[240px]">
        <LiveStatusBar />
        <main className="flex-1 overflow-auto bg-[linear-gradient(160deg,#050905_0%,#030303_30%,#030303_100%)]">
          {children}
        </main>
      </div>
    </div>
  );
}
