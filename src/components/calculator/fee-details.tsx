"use client";

import { useState } from "react";
import { ChevronDown, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  calculateFlip,
  formatCurrency,
  formatPercent,
  type FeeOptions,
  type FlipResult,
  type Marketplace,
} from "@/lib/fees";
import { cn } from "@/lib/utils";

interface FeeDetailsProps {
  purchasePrice: number;
  salePrices: Partial<Record<Marketplace, number>>;
  feeOptions: FeeOptions;
}

const MARKETPLACE_NAMES: Record<Marketplace, string> = {
  ebay: "eBay",
  stockx: "StockX",
  goat: "GOAT",
};

export function FeeDetails({
  purchasePrice,
  salePrices,
  feeOptions,
}: FeeDetailsProps) {
  const results = calculateFlip(purchasePrice, salePrices, feeOptions);

  if (results.length === 0) return null;

  const bestMarketplace = results[0]?.marketplace;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">
        Fee Breakdown
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {results.map((result) => (
          <FlipCard
            key={result.marketplace}
            result={result}
            isBest={result.marketplace === bestMarketplace && result.profit > 0}
          />
        ))}
      </div>
    </div>
  );
}

function FlipCard({ result, isBest }: { result: FlipResult; isBest: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const positive = result.profit >= 0;

  return (
    <Card
      className={cn(
        "p-4 bg-black border-border transition-colors duration-150",
        isBest && "border-primary/40",
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground">
            {MARKETPLACE_NAMES[result.marketplace]}
          </p>
          {isBest && (
            <Badge
              variant="outline"
              className="text-[10px] bg-primary/15 text-primary border-primary/25"
            >
              <Trophy className="size-2.5 mr-0.5" />
              Best
            </Badge>
          )}
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
          {formatPercent(result.roi)} ROI
        </Badge>
      </div>

      {/* Summary */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Sale Price</span>
          <span className="font-mono tabular-nums text-foreground/80">
            {formatCurrency(result.salePrice)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total Fees</span>
          <span className="font-mono tabular-nums text-red-400">
            -{formatCurrency(result.totalFees)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Cost</span>
          <span className="font-mono tabular-nums text-foreground/80">
            -{formatCurrency(result.purchasePrice)}
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
            {positive ? "+" : ""}
            {formatCurrency(result.profit)}
          </span>
        </div>
      </div>

      {/* Expandable fee line items */}
      {result.feeBreakdown.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-muted-foreground transition-colors duration-100"
          >
            <ChevronDown
              className={cn(
                "size-3 transition-transform duration-150",
                expanded && "rotate-180",
              )}
            />
            {expanded ? "Hide" : "Show"} fee details
          </button>

          {expanded && (
            <div className="mt-2 space-y-1 pl-4 border-l border-border">
              {result.feeBreakdown.map((item, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    {item.label}
                    {item.rate !== undefined && (
                      <span className="ml-1 text-muted-foreground">
                        ({formatPercent(item.rate)})
                      </span>
                    )}
                  </span>
                  <span className="font-mono tabular-nums text-muted-foreground">
                    -{formatCurrency(item.amount)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between text-xs pt-1 border-t border-white/[0.04]">
                <span className="text-muted-foreground">Effective Rate</span>
                <span className="font-mono tabular-nums text-muted-foreground">
                  {formatPercent(result.effectiveRate)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
