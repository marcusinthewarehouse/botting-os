'use client';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  title: string;
  value: string;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function KpiCard({ title, value, trend, trendDirection = 'neutral', className }: KpiCardProps) {
  return (
    <Card className={cn('p-6 bg-black border-white/[0.06] transition-colors duration-150 hover:border-amber-500/30', className)}>
      <p className="text-sm text-zinc-400">{title}</p>
      <p className="text-3xl font-semibold font-mono tabular-nums text-zinc-50 mt-1">
        {value}
      </p>
      {trend && (
        <p className="text-xs text-zinc-500 mt-2">
          <span
            className={cn(
              trendDirection === 'up' && 'text-green-400',
              trendDirection === 'down' && 'text-red-400',
              trendDirection === 'neutral' && 'text-zinc-400'
            )}
          >
            {trend}
          </span>
          {' '}vs last month
        </p>
      )}
    </Card>
  );
}
