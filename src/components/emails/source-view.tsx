"use client";

import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { RetailerTagger } from "./retailer-tagger";
import { cn } from "@/lib/utils";
import type { Email } from "@/lib/db/types";

interface SourceViewProps {
  emails: Email[];
  searchQuery: string;
  onDelete: (id: number) => void;
  onAddRetailer: (id: number, retailer: string) => void;
  onRemoveRetailer: (id: number, retailer: string) => void;
}

export function SourceView({
  emails,
  searchQuery,
  onDelete,
  onAddRetailer,
  onRemoveRetailer,
}: SourceViewProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [expandedTagger, setExpandedTagger] = useState<number | null>(null);

  const filtered = useMemo(() => {
    if (!searchQuery) return emails;
    const q = searchQuery.toLowerCase();
    return emails.filter((e) => e.address.toLowerCase().includes(q));
  }, [emails, searchQuery]);

  const groups = useMemo(() => {
    const map = new Map<string, Email[]>();
    for (const email of filtered) {
      const key = email.icloudAccount || "Unassigned";
      const list = map.get(key) ?? [];
      list.push(email);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [filtered]);

  const toggleGroup = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Build flat list for virtualizer
  const flatList = useMemo(() => {
    const items:
      | { type: "header"; key: string; count: number }[]
      | { type: "email"; email: Email }[] = [];
    for (const [key, list] of groups) {
      (items as { type: "header"; key: string; count: number }[]).push({
        type: "header",
        key,
        count: list.length,
      });
      if (!collapsed.has(key)) {
        for (const email of list) {
          (items as { type: "email"; email: Email }[]).push({
            type: "email",
            email,
          });
        }
      }
    }
    return items as (
      | { type: "header"; key: string; count: number }
      | { type: "email"; email: Email }
    )[];
  }, [groups, collapsed]);

  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: flatList.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (i) => (flatList[i].type === "header" ? 44 : 48),
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
          const retailers = (email.retailers as string[] | null) ?? [];
          return (
            <div
              key={"e-" + email.id}
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
              <div className="flex gap-1 max-w-48 overflow-hidden">
                {retailers.slice(0, 3).map((r) => (
                  <Badge
                    key={r}
                    variant="outline"
                    className="text-xs bg-primary/10 text-primary border-primary/25 shrink-0"
                  >
                    {r}
                  </Badge>
                ))}
                {retailers.length > 3 && (
                  <span className="text-xs text-muted-foreground">
                    +{retailers.length - 3}
                  </span>
                )}
              </div>
              <button
                onClick={() =>
                  setExpandedTagger(
                    expandedTagger === email.id ? null : email.id,
                  )
                }
                className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted transition-colors duration-150 opacity-0 group-hover:opacity-100"
                title="Tag retailers"
              >
                <Badge variant="outline" className="text-xs cursor-pointer">
                  +tag
                </Badge>
              </button>
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
      {expandedTagger !== null && (
        <div className="p-4 border-t border-border bg-card/80">
          <RetailerTagger
            currentRetailers={
              (emails.find((e) => e.id === expandedTagger)?.retailers as
                | string[]
                | null) ?? []
            }
            onAdd={(r) => onAddRetailer(expandedTagger, r)}
            onRemove={(r) => onRemoveRetailer(expandedTagger, r)}
          />
        </div>
      )}
    </div>
  );
}
