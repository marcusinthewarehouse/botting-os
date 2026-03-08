'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  active: 'bg-green-500/15 text-green-400 border-green-500/25',
  in_stock: 'bg-green-500/15 text-green-400 border-green-500/25',
  connected: 'bg-green-500/15 text-green-400 border-green-500/25',
  pending: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  processing: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  syncing: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  sold: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  completed: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  delivered: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  error: 'bg-red-500/15 text-red-400 border-red-500/25',
  cancelled: 'bg-red-500/15 text-red-400 border-red-500/25',
  expired: 'bg-red-500/15 text-red-400 border-red-500/25',
  banned: 'bg-red-500/15 text-red-400 border-red-500/25',
  inactive: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25',
  unused: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25',
  draft: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25',
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const colors = statusColors[status] ?? statusColors.inactive;
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <Badge variant="outline" className={cn(colors, 'text-xs font-medium', className)}>
      {label}
    </Badge>
  );
}
