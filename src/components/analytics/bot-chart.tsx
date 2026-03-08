'use client';

import { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardAction, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type ViewMode = 'checkouts' | 'profit';

interface BotChartProps {
  data: { bot: string; checkouts: number; profit: number }[];
  loading: boolean;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  const isProfit = entry.name === 'profit';
  return (
    <div className="rounded-lg border border-white/[0.06] bg-zinc-900/95 backdrop-blur-sm px-3 py-2 text-xs shadow-lg">
      <p className="text-zinc-400 mb-1">{label}</p>
      <p className="font-mono tabular-nums text-amber-400">
        {isProfit
          ? '$' + entry.value.toLocaleString('en-US', { minimumFractionDigits: 2 })
          : entry.value + ' checkouts'}
      </p>
    </div>
  );
}

export function BotChart({ data, loading }: BotChartProps) {
  const [view, setView] = useState<ViewMode>('checkouts');

  return (
    <Card className="bg-black border-white/[0.06]">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-zinc-400">Bot Performance</CardTitle>
        <CardAction>
          <div className="flex gap-1 rounded-md bg-zinc-900 p-0.5 border border-white/[0.06]">
            <button
              onClick={() => setView('checkouts')}
              className={cn(
                'px-2 py-1 text-xs rounded transition-colors duration-150',
                view === 'checkouts' ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              Checkouts
            </button>
            <button
              onClick={() => setView('profit')}
              className={cn(
                'px-2 py-1 text-xs rounded transition-colors duration-150',
                view === 'profit' ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-500 hover:text-zinc-300'
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
            <p className="text-sm text-zinc-500">No bot data for this period</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} layout="vertical" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: '#a1a1aa', fontSize: 12 }}
                axisLine={{ stroke: '#3f3f46' }}
                tickLine={false}
                tickFormatter={(v: number) => view === 'profit' ? '$' + v.toLocaleString() : String(v)}
              />
              <YAxis
                type="category"
                dataKey="bot"
                tick={{ fill: '#a1a1aa', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={100}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey={view}
                fill="#f59e0b"
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
