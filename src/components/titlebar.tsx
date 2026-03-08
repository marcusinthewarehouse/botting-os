'use client';

import { useCallback } from 'react';
import { Minus, Square, X } from 'lucide-react';
import { IS_TAURI } from '@/lib/db/client';

export function Titlebar() {
  const handleMinimize = useCallback(async () => {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    getCurrentWindow().minimize();
  }, []);

  const handleMaximize = useCallback(async () => {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    const win = getCurrentWindow();
    const maximized = await win.isMaximized();
    if (maximized) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }, []);

  const handleClose = useCallback(async () => {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    getCurrentWindow().close();
  }, []);

  return (
    <div
      data-tauri-drag-region
      className="h-8 flex items-center justify-between bg-[#09090B] border-b border-white/[0.08] no-select"
    >
      <div data-tauri-drag-region className="pl-3 text-xs font-medium text-zinc-400">
        BottingOS
      </div>
      {IS_TAURI && (
        <div className="flex h-full">
          <button
            onClick={handleMinimize}
            className="flex items-center justify-center w-11 h-full hover:bg-zinc-800 transition-colors duration-150"
          >
            <Minus className="size-3.5 text-zinc-400" />
          </button>
          <button
            onClick={handleMaximize}
            className="flex items-center justify-center w-11 h-full hover:bg-zinc-800 transition-colors duration-150"
          >
            <Square className="size-3 text-zinc-400" />
          </button>
          <button
            onClick={handleClose}
            className="flex items-center justify-center w-11 h-full hover:bg-red-500/80 transition-colors duration-150"
          >
            <X className="size-3.5 text-zinc-400" />
          </button>
        </div>
      )}
    </div>
  );
}
