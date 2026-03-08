"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  active:
    "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400",
  in_stock:
    "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400",
  connected:
    "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400",
  pending: "bg-primary/10 text-amber-700 border-primary/20 dark:text-primary",
  processing:
    "bg-primary/10 text-amber-700 border-primary/20 dark:text-primary",
  syncing: "bg-primary/10 text-amber-700 border-primary/20 dark:text-primary",
  sold: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400",
  completed:
    "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400",
  delivered:
    "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400",
  used: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400",
  error: "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400",
  cancelled: "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400",
  expired: "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400",
  banned: "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400",
  flagged: "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400",
  inactive: "bg-muted text-muted-foreground border-border",
  unused: "bg-muted text-muted-foreground border-border",
  draft: "bg-muted text-muted-foreground border-border",
  closed: "bg-muted text-muted-foreground border-border",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const colors = statusColors[status] ?? statusColors.inactive;
  const label = status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <Badge
      variant="outline"
      className={cn(colors, "text-xs font-medium", className)}
    >
      {label}
    </Badge>
  );
}
