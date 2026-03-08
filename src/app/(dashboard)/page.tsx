"use client";

import { useCallback, useEffect, useState } from "react";
import { TrendingUp, Package, CreditCard, Mail } from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageTransition } from "@/components/page-transition";
import { PageHeader } from "@/components/ui/page-header";
import { CardSkeleton } from "@/components/skeletons/card-skeleton";
import { IS_TAURI } from "@/lib/db/client";

function fmtCurrency(value: number): string {
  const prefix = value >= 0 ? "+$" : "-$";
  return (
    prefix +
    Math.abs(value).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

interface DashboardStats {
  totalProfit: number;
  activeEmails: number;
  vccsTracked: number;
  inventoryItems: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loaded, setLoaded] = useState(false);

  const loadStats = useCallback(async () => {
    if (!IS_TAURI) {
      setLoaded(true);
      return;
    }
    try {
      const { inventoryRepo, emailsRepo, vccsRepo, trackerRepo } =
        await import("@/lib/db/repositories");
      const [allInventory, allEmails, allVccs, allTracker] = await Promise.all([
        inventoryRepo.getAll(),
        emailsRepo.getAll(),
        vccsRepo.getAll(),
        trackerRepo.getAll(),
      ]);

      let income = 0;
      let expenses = 0;
      for (const entry of allTracker) {
        if (entry.type === "sale" || entry.type === "refund") {
          income += entry.amount;
        } else {
          expenses += entry.amount;
        }
      }

      // Also count inventory profit from sold items
      let inventoryProfit = 0;
      for (const item of allInventory) {
        if (item.status === "sold" && item.soldPrice != null) {
          inventoryProfit += item.soldPrice - item.purchasePrice;
        }
      }

      const totalProfit = Math.max(income - expenses, inventoryProfit);
      const inStockCount = allInventory.filter(
        (i) => i.status !== "sold",
      ).length;
      const activeEmailCount = allEmails.filter(
        (e) => e.status === "active",
      ).length;
      const activeVccCount = allVccs.filter(
        (v) => v.status === "active",
      ).length;

      setStats({
        totalProfit,
        activeEmails: activeEmailCount,
        vccsTracked: activeVccCount,
        inventoryItems: inStockCount,
      });
    } catch {
      // DB not available
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const s = stats;

  return (
    <PageTransition>
      <PageHeader
        title="Dashboard"
        description="Your command center for botting operations."
      />

      {!loaded ? (
        <CardSkeleton count={4} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            title="Total Profit"
            value={s ? fmtCurrency(s.totalProfit) : "$0.00"}
            trendDirection={
              s && s.totalProfit > 0
                ? "up"
                : s && s.totalProfit < 0
                  ? "down"
                  : "neutral"
            }
            className={
              !s || s.totalProfit >= 0
                ? "[&>p:nth-child(2)]:text-emerald-600 dark:[&>p:nth-child(2)]:text-emerald-400"
                : "[&>p:nth-child(2)]:text-destructive"
            }
          />
          <KpiCard
            title="Active Emails"
            value={s ? String(s.activeEmails) : "0"}
          />
          <KpiCard
            title="VCCs Tracked"
            value={s ? String(s.vccsTracked) : "0"}
          />
          <KpiCard
            title="Inventory Items"
            value={s ? String(s.inventoryItems) : "0"}
          />
        </div>
      )}

      {s &&
        s.totalProfit === 0 &&
        s.activeEmails === 0 &&
        s.vccsTracked === 0 &&
        s.inventoryItems === 0 && (
          <div className="mt-8 rounded-xl border border-border bg-card p-8 text-center shadow-sm">
            <p className="text-sm text-muted-foreground">
              Add data to see your stats come alive
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Press{" "}
              <kbd className="mx-1 rounded-md bg-muted border border-border px-1.5 py-0.5 text-xs text-muted-foreground">
                Cmd+K
              </kbd>{" "}
              to navigate
            </p>
          </div>
        )}
    </PageTransition>
  );
}
