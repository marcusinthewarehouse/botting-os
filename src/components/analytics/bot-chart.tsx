"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type ViewMode = "checkouts" | "profit";

interface BotChartProps {
  data: { bot: string; checkouts: number; profit: number }[];
  loading: boolean;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; name: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  const isProfit = entry.name === "profit";
  return (
    <div className="rounded-lg border border-border bg-card/95 backdrop-blur-sm px-3 py-2 text-xs shadow-lg">
      <p className="text-muted-foreground mb-1">{label}</p>
      <p className="font-mono tabular-nums text-primary">
        {isProfit
          ? "$" +
            entry.value.toLocaleString("en-US", { minimumFractionDigits: 2 })
          : entry.value + " checkouts"}
      </p>
    </div>
  );
}

export function BotChart({ data, loading }: BotChartProps) {
  const [view, setView] = useState<ViewMode>("checkouts");

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Bot Performance
        </CardTitle>
        <CardAction>
          <div className="flex gap-1 rounded-md bg-card p-0.5 border border-border">
            <button
              onClick={() => setView("checkouts")}
              className={cn(
                "px-2 py-1 text-xs rounded transition-colors duration-150",
                view === "checkouts"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-muted-foreground",
              )}
            >
              Checkouts
            </button>
            <button
              onClick={() => setView("profit")}
              className={cn(
                "px-2 py-1 text-xs rounded transition-colors duration-150",
                view === "profit"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-muted-foreground",
              )}
            >
              Profit
            </button>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              No bot data for this period
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#3f3f46"
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fill: "#a1a1aa", fontSize: 12 }}
                axisLine={{ stroke: "#3f3f46" }}
                tickLine={false}
                tickFormatter={(v: number) =>
                  view === "profit" ? "$" + v.toLocaleString() : String(v)
                }
              />
              <YAxis
                type="category"
                dataKey="bot"
                tick={{ fill: "#a1a1aa", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={100}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey={view}
                fill="hsl(var(--primary))"
                radius={[0, 4, 4, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
