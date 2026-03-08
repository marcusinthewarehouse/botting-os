'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CryptoProvider } from '@/components/providers/crypto-provider';
import { Titlebar } from '@/components/titlebar';
import { AppSidebar } from '@/components/app-sidebar';
import { CommandPalette } from '@/components/command-palette';
import { TooltipProvider } from '@/components/ui/tooltip';
import { usePriceAlertPolling } from '@/hooks/use-price-alerts';
import { checkReminders } from '@/lib/reminders';
import { settingsRepo } from '@/lib/db/repositories';
import { IS_TAURI } from '@/lib/db/client';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(!IS_TAURI);

  usePriceAlertPolling();

  useEffect(() => {
    async function checkOnboarding() {
      if (!IS_TAURI) return;
      try {
        const value = await settingsRepo.get('onboarding_complete');
        if (!value || value !== 'true') {
          router.replace('/onboarding');
          return;
        }
      } catch {
        // DB not ready - allow dashboard to load
      }
      setReady(true);
    }
    checkOnboarding();
  }, [router]);

  useEffect(() => {
    checkReminders();
    const interval = setInterval(checkReminders, 60_000);
    return () => clearInterval(interval);
  }, []);

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

  if (!ready) {
    return <div className="min-h-screen bg-[#09090B]" />;
  }

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
