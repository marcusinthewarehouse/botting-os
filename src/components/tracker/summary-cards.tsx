"use client";

import { TrendingUp, TrendingDown, DollarSign, Receipt } from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";

function fmt(value: number): string {
  return (
    "$" +
    Math.abs(value).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

interface SummaryCardsProps {
  totalIncome: number;
  totalExpenses: number;
  netPL: number;
  transactionCount: number;
}

export function SummaryCards({
  totalIncome,
  totalExpenses,
  netPL,
  transactionCount,
}: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        title="Total Income"
        value={"+" + fmt(totalIncome)}
        className="[&>p:nth-child(2)]:text-green-400"
      />
      <KpiCard
        title="Total Expenses"
        value={"-" + fmt(totalExpenses)}
        className="[&>p:nth-child(2)]:text-red-400"
      />
      <KpiCard
        title="Net P&L"
        value={(netPL >= 0 ? "+" : "-") + fmt(netPL)}
        className={
          netPL >= 0
            ? "[&>p:nth-child(2)]:text-green-400"
            : "[&>p:nth-child(2)]:text-red-400"
        }
      />
      <KpiCard title="Transactions" value={String(transactionCount)} />
    </div>
  );
}
