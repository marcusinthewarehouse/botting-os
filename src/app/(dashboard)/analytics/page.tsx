"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { PageTransition } from "@/components/page-transition";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCards } from "@/components/analytics/kpi-cards";
import { ProfitChart } from "@/components/analytics/profit-chart";
import { BotChart } from "@/components/analytics/bot-chart";
import { CategoryChart } from "@/components/analytics/category-chart";
import {
  getAnalytics,
  type AnalyticsData,
  type TimeRange,
} from "@/lib/analytics";
import { cn } from "@/lib/utils";

const TIME_RANGES: { label: string; value: TimeRange }[] = [
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
  { label: "1y", value: "1y" },
  { label: "All", value: "all" },
];

export default function AnalyticsPage() {
  const router = useRouter();
  const [range, setRange] = useState<TimeRange>("30d");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async (r: TimeRange) => {
    setLoading(true);
    try {
      const result = await getAnalytics(r);
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(range);
  }, [range, loadData]);

  const handleRangeChange = useCallback((r: TimeRange) => {
    setRange(r);
  }, []);

  const isEmpty =
    data &&
    !loading &&
    data.totalProfit === 0 &&
    data.totalSpend === 0 &&
    data.itemsSold === 0 &&
    data.profitOverTime.length === 0 &&
    data.botPerformance.length === 0 &&
    data.categoryROI.length === 0;

  return (
    <PageTransition>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your performance across all operations.
          </p>
        </div>
        <div className="flex gap-1 rounded-md bg-card p-0.5 border border-border">
          {TIME_RANGES.map((tr) => (
            <button
              key={tr.value}
              onClick={() => handleRangeChange(tr.value)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded transition-colors duration-150",
                range === tr.value
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-muted-foreground",
              )}
            >
              {tr.label}
            </button>
          ))}
        </div>
      </div>

      {isEmpty ? (
        <EmptyState
          icon={BarChart3}
          title="No analytics data yet"
          description="Start tracking orders and sales to see your performance here."
          action={{
            label: "Go to Orders",
            onClick: () => router.push("/orders"),
          }}
        />
      ) : (
        <div className="space-y-6">
          <KpiCards data={data} loading={loading} />
          <ProfitChart data={data?.profitOverTime ?? []} loading={loading} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BotChart data={data?.botPerformance ?? []} loading={loading} />
            <CategoryChart data={data?.categoryROI ?? []} loading={loading} />
          </div>
        </div>
      )}
    </PageTransition>
  );
}
