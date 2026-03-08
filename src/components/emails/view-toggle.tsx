"use client";

import { cn } from "@/lib/utils";

interface ViewToggleProps {
  view: "source" | "retailer";
  onViewChange: (view: "source" | "retailer") => void;
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex rounded-md border border-border bg-card p-0.5">
      <button
        onClick={() => onViewChange("source")}
        className={cn(
          "px-3 py-1.5 text-xs font-medium rounded transition-colors duration-150",
          view === "source"
            ? "bg-primary/15 text-primary"
            : "text-muted-foreground hover:text-foreground/80",
        )}
      >
        By Source
      </button>
      <button
        onClick={() => onViewChange("retailer")}
        className={cn(
          "px-3 py-1.5 text-xs font-medium rounded transition-colors duration-150",
          view === "retailer"
            ? "bg-primary/15 text-primary"
            : "text-muted-foreground hover:text-foreground/80",
        )}
      >
        By Retailer
      </button>
    </div>
  );
}
