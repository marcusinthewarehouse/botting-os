"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string;
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
  className?: string;
}

export function KpiCard({
  title,
  value,
  trend,
  trendDirection = "neutral",
  className,
}: KpiCardProps) {
  return (
    <Card
      className={cn(
        "p-5 bg-card border-border shadow-sm transition-all duration-150 hover:shadow-md hover:border-primary/20 hover:-translate-y-px",
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        {title}
      </p>
      <p className="text-3xl font-semibold font-mono tabular-nums text-foreground leading-none mb-2.5">
        {value}
      </p>
      {trend && (
        <p className="text-xs flex items-center gap-1">
          <span
            className={cn(
              trendDirection === "up" &&
                "text-emerald-600 dark:text-emerald-400",
              trendDirection === "down" && "text-destructive",
              trendDirection === "neutral" && "text-muted-foreground",
            )}
          >
            {trend}
          </span>
          <span className="text-muted-foreground">vs last month</span>
        </p>
      )}
    </Card>
  );
}
