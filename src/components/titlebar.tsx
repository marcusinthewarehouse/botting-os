"use client";

import { useCallback } from "react";
import { Minus, Square, X, Sun, Moon } from "lucide-react";
import { IS_TAURI } from "@/lib/db/client";
import { NotificationCenter } from "@/components/notification-center";
import { useTheme } from "@/components/providers/theme-provider";

export function Titlebar() {
  const { theme, toggleTheme } = useTheme();

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
      className="h-8 flex items-center justify-between bg-card border-b border-border no-select"
    >
      <div
        data-tauri-drag-region
        className="pl-3 text-xs font-medium text-muted-foreground"
      >
        BottingOS
      </div>
      <div className="flex h-full items-center">
        <div className="mr-1">
          <NotificationCenter />
        </div>
        <button
          onClick={toggleTheme}
          aria-label={
            theme === "light" ? "Switch to dark mode" : "Switch to light mode"
          }
          className="flex items-center justify-center w-8 h-full hover:bg-accent text-muted-foreground hover:text-accent-foreground transition-colors duration-150"
        >
          {theme === "light" ? (
            <Moon className="size-3.5" />
          ) : (
            <Sun className="size-3.5" />
          )}
        </button>
        {IS_TAURI && (
          <>
            <button
              onClick={handleMinimize}
              aria-label="Minimize"
              className="flex items-center justify-center w-11 h-full hover:bg-muted text-muted-foreground transition-colors duration-150"
            >
              <Minus className="size-3.5" />
            </button>
            <button
              onClick={handleMaximize}
              aria-label="Maximize"
              className="flex items-center justify-center w-11 h-full hover:bg-muted text-muted-foreground transition-colors duration-150"
            >
              <Square className="size-3" />
            </button>
            <button
              onClick={handleClose}
              aria-label="Close"
              className="flex items-center justify-center w-11 h-full hover:bg-destructive/80 text-muted-foreground hover:text-white transition-colors duration-150"
            >
              <X className="size-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
