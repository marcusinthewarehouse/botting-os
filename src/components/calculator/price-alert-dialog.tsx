"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { priceAlertsRepo } from "@/lib/db/repositories";
import { IS_TAURI } from "@/lib/db/client";
import type { PriceAlert } from "@/lib/db/types";
import { cn } from "@/lib/utils";

interface PriceAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName?: string;
  styleId?: string;
  marketplace?: string;
  currentPrice?: number;
  size?: string;
  imageUrl?: string;
}

const MARKETPLACE_LABELS: Record<string, string> = {
  stockx: "StockX",
  goat: "GOAT",
  ebay: "eBay",
};

function formatDate(date: Date | null): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function PriceAlertDialog({
  open,
  onOpenChange,
  productName = "",
  styleId = "",
  marketplace = "stockx",
  currentPrice = 0,
  size,
  imageUrl,
}: PriceAlertDialogProps) {
  const [targetPrice, setTargetPrice] = useState("");
  const [direction, setDirection] = useState<"below" | "above">("below");
  const [recurring, setRecurring] = useState(false);
  const [selectedMarketplace, setSelectedMarketplace] = useState(marketplace);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);

  const selectClass =
    "w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground/80 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50";

  const loadAlerts = useCallback(async () => {
    if (!IS_TAURI) return;
    try {
      const all = await priceAlertsRepo.getAll();
      setAlerts(all);
    } catch {
      // DB not available
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadAlerts();
      setSelectedMarketplace(marketplace);
      if (currentPrice > 0) {
        setTargetPrice(String(Math.floor(currentPrice * 0.9)));
      }
    }
  }, [open, marketplace, currentPrice, loadAlerts]);

  const handleCreate = useCallback(async () => {
    const target = parseFloat(targetPrice);
    if (!target || target <= 0 || !styleId) return;

    try {
      await priceAlertsRepo.create({
        productName: productName || "Unknown Product",
        styleId,
        marketplace: selectedMarketplace,
        size: size ?? null,
        targetPrice: target,
        direction,
        currentPrice: currentPrice || null,
        recurring,
        imageUrl: imageUrl ?? null,
      });
      setTargetPrice("");
      setRecurring(false);
      await loadAlerts();
    } catch {
      // DB not available
    }
  }, [
    targetPrice,
    styleId,
    productName,
    selectedMarketplace,
    size,
    direction,
    currentPrice,
    recurring,
    imageUrl,
    loadAlerts,
  ]);

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await priceAlertsRepo.remove(id);
        await loadAlerts();
      } catch {
        // DB not available
      }
    },
    [loadAlerts],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Price Alerts</SheetTitle>
          <SheetDescription>
            Get notified when prices cross your target.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Create new alert */}
          {styleId && (
            <Card className="p-4 bg-card border-border space-y-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                New Alert
              </p>

              {productName && (
                <p className="text-sm text-foreground/80 truncate">
                  {productName}
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">
                    Marketplace
                  </Label>
                  <select
                    value={selectedMarketplace}
                    onChange={(e) => setSelectedMarketplace(e.target.value)}
                    className={selectClass}
                  >
                    <option value="stockx">StockX</option>
                    <option value="goat">GOAT</option>
                    <option value="ebay">eBay</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">
                    Direction
                  </Label>
                  <select
                    value={direction}
                    onChange={(e) =>
                      setDirection(e.target.value as "below" | "above")
                    }
                    className={selectClass}
                  >
                    <option value="below">Drops below</option>
                    <option value="above">Rises above</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">
                  Target Price
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={
                      currentPrice > 0 ? currentPrice.toFixed(2) : "0.00"
                    }
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    className="bg-card border-border pl-7 font-mono tabular-nums"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="alert-recurring"
                  checked={recurring}
                  onChange={(e) => setRecurring(e.target.checked)}
                  className="rounded border-border bg-card text-primary focus:ring-primary/50"
                />
                <Label
                  htmlFor="alert-recurring"
                  className="text-muted-foreground text-xs"
                >
                  Recurring (re-trigger each time price crosses)
                </Label>
              </div>

              <Button onClick={handleCreate} className="w-full" size="sm">
                <Bell className="size-3.5 mr-2" />
                Create Alert
              </Button>
            </Card>
          )}

          {/* Alert list */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Active Alerts ({alerts.length})
            </p>

            {alerts.length === 0 ? (
              <EmptyState
                icon={BellOff}
                title="No alerts"
                description="Create an alert to get notified when prices change."
                className="py-8"
              />
            ) : (
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <AlertRow
                    key={alert.id}
                    alert={alert}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function AlertRow({
  alert,
  onDelete,
}: {
  alert: PriceAlert;
  onDelete: (id: number) => void;
}) {
  const triggered = alert.triggered && !alert.recurring;

  return (
    <Card className="flex items-center justify-between px-3 py-2.5 bg-black border-border group">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-foreground/80 truncate">
          {alert.productName}
        </p>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
          <span>
            {MARKETPLACE_LABELS[alert.marketplace] ?? alert.marketplace}
          </span>
          <span className="font-mono tabular-nums">
            {alert.direction === "below" ? "<" : ">"} $
            {alert.targetPrice.toFixed(2)}
          </span>
          {alert.currentPrice != null && alert.currentPrice > 0 && (
            <span className="font-mono tabular-nums">
              now ${alert.currentPrice.toFixed(2)}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Badge
          variant="outline"
          className={cn(
            "text-[10px]",
            triggered
              ? "bg-blue-500/15 text-blue-400 border-blue-500/25"
              : "bg-green-500/15 text-green-400 border-green-500/25",
          )}
        >
          {triggered ? "triggered" : "active"}
        </Badge>
        {alert.recurring && (
          <Badge
            variant="outline"
            className="text-[10px] bg-primary/15 text-primary border-primary/25"
          >
            recurring
          </Badge>
        )}
        <button
          onClick={() => onDelete(alert.id)}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted transition-all duration-150"
        >
          <Trash2 className="size-3 text-muted-foreground hover:text-red-400" />
        </button>
      </div>
    </Card>
  );
}
