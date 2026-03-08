'use client';

import { useEffect } from 'react';
import { CryptoProvider } from '@/components/providers/crypto-provider';
import { Titlebar } from '@/components/titlebar';
import { AppSidebar } from '@/components/app-sidebar';
import { CommandPalette } from '@/components/command-palette';
import { TooltipProvider } from '@/components/ui/tooltip';
import { usePriceAlertPolling } from '@/hooks/use-price-alerts';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  usePriceAlertPolling();

  useEffect(() => {
    function handleContextMenu(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const tagName = target.tagName;
      if (tagName === 'INPUT' || tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      e.preventDefault();
    }
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  return (
    <TooltipProvider delay={200}>
      <CryptoProvider>
        <Titlebar />
        <div className="flex h-[calc(100vh-32px)]">
          <AppSidebar />
          <main className="flex-1 overflow-auto bg-[#09090B] p-6">
            <CommandPalette />
            {children}
          </main>
        </div>
      </CryptoProvider>
    </TooltipProvider>
  );
}
