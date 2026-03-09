"use client";

import { useCallback } from "react";
import { Minus, Square, X, Bell, Settings } from "lucide-react";
import { IS_TAURI } from "@/lib/db/client";
import { NotificationCenter } from "@/components/notification-center";

export function Titlebar() {
  const handleMinimize = useCallback(async () => {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    getCurrentWindow().minimize();
  }, []);

  const handleMaximize = useCallback(async () => {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const win = getCurrentWindow();
    const maximized = await win.isMaximized();
    if (maximized) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }, []);

  const handleClose = useCallback(async () => {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    getCurrentWindow().close();
  }, []);

  return (
    <div
      data-tauri-drag-region
      className="h-[38px] flex items-center justify-between border-b border-border no-select"
      style={{ background: "#131318" }}
    >
      <div data-tauri-drag-region className="pl-3.5 flex items-center gap-2">
        <div
          className="w-[7px] h-[7px] rounded-full bg-primary animate-pulse-dot"
          style={{ boxShadow: "0 0 8px #00d4aa" }}
        />
        <span className="text-[12px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
          BottingOS
        </span>
      </div>
      <div className="flex h-full items-center gap-1.5 pr-1">
        <div className="flex items-center gap-[5px] text-[10px] font-semibold uppercase tracking-[0.06em] text-primary mr-2">
          <span
            className="w-1.5 h-1.5 rounded-full bg-primary"
            style={{ animation: "pulse-dot 2s ease-in-out infinite" }}
          />
          Live
        </div>
        <div className="mr-1">
          <NotificationCenter />
        </div>
        {IS_TAURI && (
          <>
            <button
              onClick={handleMinimize}
              aria-label="Minimize"
              className="flex items-center justify-center w-7 h-7 rounded-md text-[#585870] hover:bg-[#1e1e26] hover:text-[#8e8ea3] transition-all duration-[120ms]"
            >
              <Minus className="size-3.5" />
            </button>
            <button
              onClick={handleMaximize}
              aria-label="Maximize"
              className="flex items-center justify-center w-7 h-7 rounded-md text-[#585870] hover:bg-[#1e1e26] hover:text-[#8e8ea3] transition-all duration-[120ms]"
            >
              <Square className="size-3" />
            </button>
            <button
              onClick={handleClose}
              aria-label="Close"
              className="flex items-center justify-center w-7 h-7 rounded-md text-[#585870] hover:bg-[rgba(255,77,106,0.1)] hover:text-[#ff4d6a] transition-all duration-[120ms]"
            >
              <X className="size-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
