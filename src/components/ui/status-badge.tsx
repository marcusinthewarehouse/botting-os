"use client";

import { cn } from "@/lib/utils";

const statusStyles: Record<string, { bg: string; text: string; dot: string }> =
  {
    active: {
      bg: "bg-[rgba(0,212,170,0.12)]",
      text: "text-[#00d4aa]",
      dot: "bg-[#00d4aa]",
    },
    in_stock: {
      bg: "bg-[rgba(0,212,170,0.12)]",
      text: "text-[#00d4aa]",
      dot: "bg-[#00d4aa]",
    },
    connected: {
      bg: "bg-[rgba(0,212,170,0.12)]",
      text: "text-[#00d4aa]",
      dot: "bg-[#00d4aa]",
    },
    pending: {
      bg: "bg-[rgba(255,178,36,0.1)]",
      text: "text-[#ffb224]",
      dot: "bg-[#ffb224]",
    },
    processing: {
      bg: "bg-[rgba(255,178,36,0.1)]",
      text: "text-[#ffb224]",
      dot: "bg-[#ffb224]",
    },
    syncing: {
      bg: "bg-[rgba(255,178,36,0.1)]",
      text: "text-[#ffb224]",
      dot: "bg-[#ffb224]",
    },
    sold: {
      bg: "bg-[rgba(77,158,255,0.1)]",
      text: "text-[#4d9eff]",
      dot: "bg-[#4d9eff]",
    },
    completed: {
      bg: "bg-[rgba(77,158,255,0.1)]",
      text: "text-[#4d9eff]",
      dot: "bg-[#4d9eff]",
    },
    delivered: {
      bg: "bg-[rgba(77,158,255,0.1)]",
      text: "text-[#4d9eff]",
      dot: "bg-[#4d9eff]",
    },
    used: {
      bg: "bg-[rgba(77,158,255,0.1)]",
      text: "text-[#4d9eff]",
      dot: "bg-[#4d9eff]",
    },
    error: {
      bg: "bg-[rgba(255,77,106,0.1)]",
      text: "text-[#ff4d6a]",
      dot: "bg-[#ff4d6a]",
    },
    cancelled: {
      bg: "bg-[rgba(255,77,106,0.1)]",
      text: "text-[#ff4d6a]",
      dot: "bg-[#ff4d6a]",
    },
    expired: {
      bg: "bg-[rgba(255,77,106,0.1)]",
      text: "text-[#ff4d6a]",
      dot: "bg-[#ff4d6a]",
    },
    banned: {
      bg: "bg-[rgba(255,77,106,0.1)]",
      text: "text-[#ff4d6a]",
      dot: "bg-[#ff4d6a]",
    },
    flagged: {
      bg: "bg-[rgba(255,77,106,0.1)]",
      text: "text-[#ff4d6a]",
      dot: "bg-[#ff4d6a]",
    },
    inactive: {
      bg: "bg-muted",
      text: "text-muted-foreground",
      dot: "bg-muted-foreground",
    },
    unused: {
      bg: "bg-muted",
      text: "text-muted-foreground",
      dot: "bg-muted-foreground",
    },
    draft: {
      bg: "bg-muted",
      text: "text-muted-foreground",
      dot: "bg-muted-foreground",
    },
    closed: {
      bg: "bg-muted",
      text: "text-muted-foreground",
      dot: "bg-muted-foreground",
    },
  };

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const style = statusStyles[status] ?? statusStyles.inactive;
  const label = status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <span
      className={cn(
        "inline-flex items-center gap-[5px] px-2 py-0.5 rounded text-[10.5px] font-semibold tracking-[0.01em]",
        style.bg,
        style.text,
        className,
      )}
    >
      <span
        className={cn("w-[5px] h-[5px] rounded-full shrink-0", style.dot)}
      />
      {label}
    </span>
  );
}
