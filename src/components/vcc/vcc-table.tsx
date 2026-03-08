"use client";

import { useCallback } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import type { Vcc, Email } from "@/lib/db/types";

export type VccWithEmail = Vcc & { linkedEmail?: Email };

const VCC_STATUSES = ["active", "used", "closed", "flagged"] as const;

interface VccTableProps {
  vccs: VccWithEmail[];
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onStatusChange: (id: number, status: string) => void;
}

export function VccTable({
  vccs,
  onEdit,
  onDelete,
  onStatusChange,
}: VccTableProps) {
  const handleStatusClick = useCallback(
    (id: number, currentStatus: string) => {
      const idx = VCC_STATUSES.indexOf(
        currentStatus as (typeof VCC_STATUSES)[number],
      );
      const next = VCC_STATUSES[(idx + 1) % VCC_STATUSES.length];
      onStatusChange(id, next);
    },
    [onStatusChange],
  );

  return (
    <Card className="bg-card border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                Label
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                Last 4
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                Provider
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                Linked Account
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                Status
              </th>
              <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {vccs.map((vcc) => (
              <tr
                key={vcc.id}
                className="border-b border-border last:border-b-0 hover:bg-card/50 transition-colors duration-150 group"
              >
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-foreground">
                    {vcc.label || "-"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm font-mono text-foreground">
                    ****{vcc.lastFour}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border",
                      "bg-muted/50 text-foreground border-border",
                    )}
                  >
                    {vcc.provider ?? "Unknown"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {vcc.linkedEmail ? (
                    <span
                      className="text-sm text-muted-foreground truncate max-w-[200px] block"
                      title={vcc.linkedEmail.address}
                    >
                      {vcc.linkedEmail.address}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() =>
                      handleStatusClick(vcc.id, vcc.status ?? "active")
                    }
                    title="Click to cycle status"
                    className="cursor-pointer"
                  >
                    <StatusBadge status={vcc.status ?? "active"} />
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <button
                      onClick={() => onEdit(vcc.id)}
                      className="p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-muted transition-colors duration-150"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(vcc.id)}
                      className="p-1.5 rounded text-muted-foreground hover:text-red-400 hover:bg-muted transition-colors duration-150"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
