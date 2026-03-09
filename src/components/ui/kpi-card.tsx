"use client";

import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string;
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
  icon?: React.ReactNode;
  iconColor?: "green" | "blue" | "amber";
  className?: string;
}

export function KpiCard({
  title,
  value,
  trend,
  trendDirection = "neutral",
  icon,
  iconColor = "green",
  className,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[10px] border border-border p-4 transition-all duration-150 hover:border-[rgba(255,255,255,0.12)] hover:-translate-y-px group",
        className,
      )}
      style={{ background: "#1e1e26" }}
    >
      {/* Top accent line on hover */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-transparent group-hover:bg-primary transition-colors duration-150" />

      <div className="flex items-center justify-between mb-2.5">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#585870]">
          {title}
        </p>
        {icon && (
          <div
            className={cn(
              "w-7 h-7 rounded-[7px] flex items-center justify-center",
              iconColor === "green" && "bg-[rgba(0,212,170,0.1)]",
              iconColor === "blue" && "bg-[rgba(77,158,255,0.1)]",
              iconColor === "amber" && "bg-[rgba(255,178,36,0.1)]",
            )}
          >
            {icon}
          </div>
        )}
      </div>
      <p
        className={cn(
          "text-[26px] font-semibold font-mono tabular-nums leading-none mb-1.5 tracking-[-0.03em]",
          trendDirection === "up" && "text-primary",
          trendDirection === "down" && "text-destructive",
          trendDirection === "neutral" && "text-foreground",
        )}
      >
        {value}
      </p>
      {trend && (
        <div className="flex items-center gap-1 text-[11px] text-[#585870]">
          <span
            className={cn(
              "font-mono text-[10px] font-semibold px-[5px] py-px rounded",
              trendDirection === "up" &&
                "bg-[rgba(0,212,170,0.12)] text-primary",
              trendDirection === "down" &&
                "bg-[rgba(255,77,106,0.1)] text-destructive",
              trendDirection === "neutral" && "text-[#585870]",
            )}
          >
            {trend}
          </span>
          <span>vs last month</span>
        </div>
      )}
    </div>
  );
}
