'use client';

import { KpiCard } from '@/components/ui/kpi-card';
import { Skeleton } from '@/components/ui/skeleton';
import type { AnalyticsData } from '@/lib/analytics';

function fmt(value: number): string {
  const prefix = value >= 0 ? '+$' : '-$';
  return prefix + Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtCurrency(value: number): string {
  return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtTrend(value: number): string {
  if (value === 0) return '0%';
  const prefix = value > 0 ? '+' : '';
  return prefix + value.toFixed(1) + '%';
}

interface KpiCardsProps {
  data: AnalyticsData | null;
  loading: boolean;
}

export function KpiCards({ data, loading }: KpiCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-6 rounded-xl bg-black border border-white/[0.06]">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-9 w-32 mb-2" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    );
  }

  const d = data ?? { totalProfit: 0, totalSpend: 0, itemsSold: 0, profitTrend: 0, totalRevenue: 0, categoryROI: [] };

  const avgROI = d.categoryROI.length > 0
    ? d.categoryROI.reduce((sum, c) => sum + c.roi, 0) / d.categoryROI.length
    : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        title="Total Profit"
        value={fmt(d.totalProfit)}
        trend={fmtTrend(d.profitTrend)}
        trendDirection={d.profitTrend > 0 ? 'up' : d.profitTrend < 0 ? 'down' : 'neutral'}
        className={d.totalProfit >= 0 ? '[&>p:nth-child(2)]:text-green-400' : '[&>p:nth-child(2)]:text-red-400'}
      />
      <KpiCard
        title="Total Spend"
        value={fmtCurrency(d.totalSpend)}
      />
      <KpiCard
        title="Items Sold"
        value={String(d.itemsSold)}
      />
      <KpiCard
        title="Avg ROI"
        value={avgROI.toFixed(1) + '%'}
        trendDirection={avgROI > 0 ? 'up' : avgROI < 0 ? 'down' : 'neutral'}
        className={avgROI >= 0 ? '[&>p:nth-child(2)]:text-green-400' : '[&>p:nth-child(2)]:text-red-400'}
      />
    </div>
  );
}
