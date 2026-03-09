"use client";

import { cn } from "@/lib/utils";

function formatCurrency(value: number): string {
  return (
    "$" +
    Math.abs(value).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

interface ProfitDisplayProps {
  value: number;
  className?: string;
}

export function ProfitDisplay({ value, className }: ProfitDisplayProps) {
  return (
    <span
      className={cn(
        "font-mono tabular-nums",
        value >= 0 ? "text-[#00d4aa]" : "text-[#ff4d6a]",
        className,
      )}
    >
      {value >= 0 ? "+" : "-"}
      {formatCurrency(value)}
    </span>
  );
}
