"use client";

import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import type { Email } from "@/lib/db/types";

interface RetailerViewProps {
  emails: Email[];
  searchQuery: string;
  onDelete: (id: number) => void;
}

export function RetailerView({
  emails,
  searchQuery,
  onDelete,
}: RetailerViewProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!searchQuery) return emails;
    const q = searchQuery.toLowerCase();
    return emails.filter((e) => e.address.toLowerCase().includes(q));
  }, [emails, searchQuery]);

  const groups = useMemo(() => {
    const map = new Map<string, Email[]>();
    for (const email of filtered) {
      const retailers = (email.retailers as string[] | null) ?? [];
      if (retailers.length === 0) {
        const list = map.get("Untagged") ?? [];
        list.push(email);
        map.set("Untagged", list);
      } else {
        for (const r of retailers) {
          const list = map.get(r) ?? [];
          list.push(email);
          map.set(r, list);
        }
      }
    }
    return Array.from(map.entries()).sort((a, b) => {
      if (a[0] === "Untagged") return 1;
      if (b[0] === "Untagged") return -1;
      return b[1].length - a[1].length;
    });
  }, [filtered]);

  const toggleGroup = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const flatList = useMemo(() => {
    const items: (
      | { type: "header"; key: string; count: number }
      | { type: "email"; email: Email }
    )[] = [];
    for (const [key, list] of groups) {
      items.push({ type: "header", key, count: list.length });
      if (!collapsed.has(key)) {
        for (const email of list) {
          items.push({ type: "email", email });
        }
      }
    }
    return items;
  }, [groups, collapsed]);

  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: flatList.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (i) => (flatList[i].type === "header" ? 44 : 44),
    overscan: 20,
  });

  return (
    <div
      ref={parentRef}
      className="max-h-[calc(100vh-320px)] overflow-auto rounded-md border border-border"
    >
      <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = flatList[virtualRow.index];
          if (item.type === "header") {
            const isCollapsed = collapsed.has(item.key);
            return (
              <div
                key={"h-" + item.key}
                style={{
                  position: "absolute",
                  top: virtualRow.start,
                  left: 0,
                  right: 0,
                  height: virtualRow.size,
                }}
                onClick={() => toggleGroup(item.key)}
                className="flex items-center gap-2 px-4 bg-card/50 border-b border-border cursor-pointer hover:bg-muted/50 no-select"
              >
                {isCollapsed ? (
                  <ChevronRight className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="size-4 text-muted-foreground" />
                )}
                <span className="text-sm font-medium text-foreground/80">
                  {item.key}
                </span>
                <Badge
                  variant="outline"
                  className="text-xs bg-muted/50 text-muted-foreground border-border"
                >
                  {item.count}
                </Badge>
              </div>
            );
          }

          const email = item.email;
          return (
            <div
              key={"e-" + email.id + "-" + virtualRow.index}
              style={{
                position: "absolute",
                top: virtualRow.start,
                left: 0,
                right: 0,
                height: virtualRow.size,
              }}
              className="flex items-center gap-3 px-4 pl-10 border-b border-border hover:bg-muted/30 group"
            >
              <span className="text-sm text-muted-foreground flex-1 truncate font-mono">
                {email.address}
              </span>
              <StatusBadge status={email.status ?? "active"} />
              {email.icloudAccount && (
                <span className="text-xs text-muted-foreground hidden md:block">
                  {email.icloudAccount}
                </span>
              )}
              <button
                onClick={() => onDelete(email.id)}
                className="p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-muted transition-colors duration-150 opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
