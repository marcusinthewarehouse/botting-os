'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface CategoryChartProps {
  data: { category: string; roi: number; profit: number }[];
  loading: boolean;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; payload: { profit: number } }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  const profit = entry.payload.profit;
  return (
    <div className="rounded-lg border border-white/[0.06] bg-zinc-900/95 backdrop-blur-sm px-3 py-2 text-xs shadow-lg">
      <p className="text-zinc-400 mb-1">{label}</p>
      <p className="font-mono tabular-nums text-zinc-50">
        ROI: {entry.value.toFixed(1)}%
      </p>
      <p className={`font-mono tabular-nums ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        Profit: {profit >= 0 ? '+' : ''}${profit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </p>
    </div>
  );
}

export function CategoryChart({ data, loading }: CategoryChartProps) {
  return (
    <Card className="bg-black border-white/[0.06]">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-zinc-400">ROI by Category</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-sm text-zinc-500">No category data for this period</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
              <XAxis
                dataKey="category"
                tick={{ fill: '#a1a1aa', fontSize: 12 }}
                axisLine={{ stroke: '#3f3f46' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#a1a1aa', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => v + '%'}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="roi" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {data.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.roi >= 0 ? '#4ade80' : '#f87171'}
                    fillOpacity={0.8}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
