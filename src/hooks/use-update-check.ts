import { useEffect, useState } from 'react';
import { IS_TAURI } from '@/lib/db/client';

interface UpdateInfo {
  available: boolean;
  version?: string;
}

export function useUpdateCheck() {
  const [update, setUpdate] = useState<UpdateInfo>({ available: false });

  useEffect(() => {
    if (!IS_TAURI) return;

    async function check() {
      try {
        const { check } = await import('@tauri-apps/plugin-updater');
        const result = await check();
        if (result?.available) {
          setUpdate({ available: true, version: result.version });
        }
      } catch {
        // Silently ignore - updater endpoint not configured yet
      }
    }

    // Check after a short delay to not block startup
    const timeout = setTimeout(check, 5_000);
    return () => clearTimeout(timeout);
  }, []);

  return update;
}
