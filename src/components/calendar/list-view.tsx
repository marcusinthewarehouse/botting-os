"use client";

import { useMemo } from "react";
import { Bell, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Drop } from "@/lib/db/types";

const categoryColors: Record<string, string> = {
  sneakers: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  pokemon: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
  funko: "bg-purple-500/15 text-purple-400 border-purple-500/25",
  supreme: "bg-red-500/15 text-red-400 border-red-500/25",
  electronics: "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
  "trading cards": "bg-orange-500/15 text-orange-400 border-orange-500/25",
  other: "bg-muted/40 text-muted-foreground border-border",
};

function getCategoryStyle(category: string | null): string {
  return categoryColors[category ?? "other"] ?? categoryColors.other;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getDateLabel(date: Date, today: Date): string {
  if (isSameDay(date, today)) return "TODAY";

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (isSameDay(date, tomorrow)) return "TOMORROW";

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

const REMINDER_LABELS: Record<number, string> = {
  5: "5 min before",
  15: "15 min before",
  30: "30 min before",
  60: "1 hour before",
  1440: "1 day before",
};

interface ListViewProps {
  drops: Drop[];
  onDropClick: (drop: Drop) => void;
}

export function ListView({ drops, onDropClick }: ListViewProps) {
  const today = useMemo(() => new Date(), []);

  const grouped = useMemo(() => {
    const sorted = [...drops].sort((a, b) => {
      const da = a.dropDate?.getTime() ?? 0;
      const db = b.dropDate?.getTime() ?? 0;
      return da - db;
    });

    const groups: {
      label: string;
      date: Date;
      drops: Drop[];
      isPast: boolean;
    }[] = [];
    let currentKey = "";

    for (const drop of sorted) {
      if (!drop.dropDate) continue;
      const d = new Date(drop.dropDate);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

      if (key !== currentKey) {
        currentKey = key;
        const isPast = d < today && !isSameDay(d, today);
        groups.push({
          label: getDateLabel(d, today),
          date: d,
          drops: [drop],
          isPast,
        });
      } else {
        groups[groups.length - 1].drops.push(drop);
      }
    }

    return groups;
  }, [drops, today]);

  return (
    <div className="space-y-2">
      {grouped.map((group) => (
        <div key={group.label} className={cn(group.isPast && "opacity-50")}>
          <div className="flex items-center gap-2 mb-2">
            <span
              className={cn(
                "text-xs font-semibold tracking-wider",
                group.label === "TODAY"
                  ? "text-primary"
                  : "text-muted-foreground",
              )}
            >
              {group.label}
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="space-y-1">
            {group.drops.map((drop) => (
              <button
                key={drop.id}
                onClick={() => onDropClick(drop)}
                className="w-full flex items-center gap-3 rounded-lg bg-card border border-border px-4 py-3 text-left transition-colors duration-150 hover:border-primary/30"
              >
                <span
                  className={cn(
                    "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium shrink-0",
                    getCategoryStyle(drop.category),
                  )}
                >
                  {drop.category ?? "other"}
                </span>

                <div className="flex-1 min-w-0">
                  <span className="text-sm text-foreground truncate block">
                    {drop.productName}
                  </span>
                  {drop.brand && (
                    <span className="text-xs text-muted-foreground">
                      {drop.brand}
                    </span>
                  )}
                </div>

                {drop.retailer && (
                  <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                    {drop.retailer}
                  </span>
                )}

                {drop.dropTime && (
                  <span className="text-xs text-muted-foreground font-mono tabular-nums shrink-0">
                    {drop.dropTime}
                  </span>
                )}

                {drop.reminderMinutes != null && (
                  <span
                    className="flex items-center gap-1 text-[10px] text-primary/70 shrink-0"
                    title={
                      REMINDER_LABELS[drop.reminderMinutes] ??
                      `${drop.reminderMinutes} min`
                    }
                  >
                    <Bell className="size-3" />
                  </span>
                )}

                {drop.url && (
                  <ExternalLink className="size-3 text-muted-foreground shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
