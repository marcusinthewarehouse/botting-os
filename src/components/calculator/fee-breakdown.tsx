"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface FeeBreakdownData {
  salePrice: number;
  fees: number;
  profit: number;
  roi: number;
}

interface FeeBreakdownProps {
  marketplace: string;
  feeLabel: string;
  breakdown: FeeBreakdownData | null;
}

function fmt(value: number): string {
  return (
    "$" +
    Math.abs(value).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export function FeeBreakdown({
  marketplace,
  feeLabel,
  breakdown,
}: FeeBreakdownProps) {
  if (!breakdown) {
    return (
      <Card className="p-5 bg-card border-border">
        <p className="text-sm font-medium text-foreground mb-1">
          {marketplace}
        </p>
        <p className="text-xs text-muted-foreground">{feeLabel}</p>
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Enter a sale price to see breakdown
          </p>
        </div>
      </Card>
    );
  }

  const positive = breakdown.profit >= 0;

  return (
    <Card className="p-5 bg-card border-border transition-colors duration-150 hover:border-primary/30">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-medium text-foreground">{marketplace}</p>
          <p className="text-xs text-muted-foreground">{feeLabel}</p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "text-xs font-mono tabular-nums",
            positive
              ? "bg-green-500/15 text-green-400 border-green-500/25"
              : "bg-red-500/15 text-red-400 border-red-500/25",
          )}
        >
          {positive ? "+" : ""}
          {breakdown.roi}% ROI
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Sale Price</span>
          <span className="font-mono tabular-nums text-foreground/80">
            {fmt(breakdown.salePrice)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Fees</span>
          <span className="font-mono tabular-nums text-red-400">
            -{fmt(breakdown.fees)}
          </span>
        </div>

        <div className="my-2 border-t border-border" />

        <div className="flex justify-between text-base font-semibold">
          <span className="text-muted-foreground">Net Profit</span>
          <span
            className={cn(
              "font-mono tabular-nums",
              positive ? "text-green-400" : "text-red-400",
            )}
          >
            {positive ? "+" : "-"}
            {fmt(breakdown.profit)}
          </span>
        </div>
      </div>
    </Card>
  );
}
