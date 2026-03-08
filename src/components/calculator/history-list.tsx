"use client";

import { Trash2, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { CalculatorHistory } from "@/lib/db/types";

interface HistoryListProps {
  history: CalculatorHistory[];
  onSelect: (entry: CalculatorHistory) => void;
  onDelete: (id: number) => void;
}

function formatDate(date: Date | null): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getBestMarketplace(
  resultsJson: string,
): { name: string; profit: number } | null {
  try {
    const results = JSON.parse(resultsJson) as Record<
      string,
      { profit: number }
    >;
    let best: { name: string; profit: number } | null = null;
    for (const [name, data] of Object.entries(results)) {
      if (!best || data.profit > best.profit) {
        best = { name, profit: data.profit };
      }
    }
    return best;
  } catch {
    return null;
  }
}

export function HistoryList({ history, onSelect, onDelete }: HistoryListProps) {
  if (history.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="No calculations yet"
        description="Your saved calculations will appear here."
      />
    );
  }

  return (
    <div className="space-y-2">
      {history.map((entry) => {
        const best = getBestMarketplace(entry.resultsJson);
        return (
          <Card
            key={entry.id}
            onClick={() => onSelect(entry)}
            className="flex items-center justify-between px-4 py-3 bg-black border-border cursor-pointer transition-colors duration-150 hover:border-primary/30 group"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground/80 truncate">
                  {entry.productName || "Untitled"}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="font-mono tabular-nums">
                    ${entry.purchasePrice.toFixed(2)} cost
                  </span>
                  {best && (
                    <span className="font-mono tabular-nums text-green-400">
                      +${best.profit.toFixed(2)} on {best.name}
                    </span>
                  )}
                  {entry.createdAt && (
                    <span>{formatDate(entry.createdAt)}</span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(entry.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-muted transition-all duration-150"
            >
              <Trash2 className="size-3.5 text-muted-foreground hover:text-red-400" />
            </button>
          </Card>
        );
      })}
    </div>
  );
}
