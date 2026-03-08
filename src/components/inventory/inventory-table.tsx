"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  Search,
  X,
  MoreHorizontal,
  Trash2,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/fees";
import type { InventoryItem } from "@/lib/db/types";

interface InventoryTableProps {
  items: InventoryItem[];
  loading: boolean;
  onMarkAsSold: (item: InventoryItem) => void;
  onMarkAsListed: (item: InventoryItem) => void;
  onDelete: (ids: number[]) => void;
}

const STATUS_STYLES: Record<string, string> = {
  in_stock: "bg-green-500/15 text-green-400 border-green-500/25",
  listed: "bg-primary/15 text-primary border-primary/25",
  sold: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  returned: "bg-red-500/15 text-red-400 border-red-500/25",
};

const STATUS_LABELS: Record<string, string> = {
  in_stock: "In Stock",
  listed: "Listed",
  sold: "Sold",
  returned: "Returned",
};

function daysHeld(createdAt: Date | null): number {
  if (!createdAt) return 0;
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000);
}

function agingClass(days: number, status: string | null): string {
  if (status === "sold" || status === "returned") return "";
  if (days >= 60) return "bg-red-500/5";
  if (days >= 30) return "bg-primary/5";
  return "";
}

export function InventoryTable({
  items,
  loading,
  onMarkAsSold,
  onMarkAsListed,
  onDelete,
}: InventoryTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setGlobalFilter(value), 300);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const columns: ColumnDef<InventoryItem>[] = useMemo(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
            className="accent-primary"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            className="accent-primary"
          />
        ),
        enableSorting: false,
        size: 40,
      },
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ getValue }) => (
          <span className="text-foreground text-sm truncate max-w-[200px] block">
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ getValue }) => {
          const cat = getValue<string | null>() ?? "other";
          return (
            <span className="text-xs text-muted-foreground capitalize">
              {cat === "funko" ? "Funko Pops" : cat}
            </span>
          );
        },
      },
      {
        accessorKey: "purchasePrice",
        header: "Purchase",
        cell: ({ getValue }) => (
          <span className="font-mono tabular-nums text-muted-foreground">
            {formatCurrency(getValue<number>())}
          </span>
        ),
      },
      {
        accessorKey: "soldPrice",
        header: "Sold For",
        cell: ({ getValue }) => {
          const v = getValue<number | null>();
          return (
            <span className="font-mono tabular-nums text-muted-foreground">
              {v != null ? formatCurrency(v) : "-"}
            </span>
          );
        },
      },
      {
        id: "profit",
        header: "Profit",
        accessorFn: (row) =>
          row.soldPrice != null ? row.soldPrice - row.purchasePrice : null,
        cell: ({ getValue }) => {
          const v = getValue<number | null>();
          if (v == null)
            return <span className="text-muted-foreground">-</span>;
          return (
            <span
              className={cn(
                "font-mono tabular-nums",
                v >= 0 ? "text-green-400" : "text-red-400",
              )}
            >
              {v >= 0 ? "+" : ""}
              {formatCurrency(v)}
            </span>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => {
          const status = getValue<string>() ?? "in_stock";
          return (
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border",
                STATUS_STYLES[status] ?? STATUS_STYLES.in_stock,
              )}
            >
              {STATUS_LABELS[status] ?? status}
            </span>
          );
        },
      },
      {
        id: "daysHeld",
        header: "Days",
        accessorFn: (row) => daysHeld(row.createdAt),
        cell: ({ getValue, row }) => {
          const days = getValue<number>();
          const status = row.original.status;
          return (
            <span
              className={cn(
                "font-mono tabular-nums text-xs",
                status !== "sold" &&
                  status !== "returned" &&
                  days >= 60 &&
                  "text-red-400",
                status !== "sold" &&
                  status !== "returned" &&
                  days >= 30 &&
                  days < 60 &&
                  "text-primary",
                (status === "sold" || status === "returned" || days < 30) &&
                  "text-muted-foreground",
              )}
            >
              {days}d
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const item = row.original;
          const isOpen = openMenu === item.id;
          return (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenu(isOpen ? null : item.id);
                }}
                className="rounded p-1 text-muted-foreground hover:text-muted-foreground hover:bg-muted transition-colors"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {isOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 w-40 rounded-md border border-border bg-card py-1 shadow-lg">
                  {item.status === "in_stock" && (
                    <>
                      <button
                        onClick={() => {
                          onMarkAsListed(item);
                          setOpenMenu(null);
                        }}
                        className="w-full px-3 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted"
                      >
                        Mark as Listed
                      </button>
                      <button
                        onClick={() => {
                          onMarkAsSold(item);
                          setOpenMenu(null);
                        }}
                        className="w-full px-3 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted"
                      >
                        Mark as Sold
                      </button>
                    </>
                  )}
                  {item.status === "listed" && (
                    <button
                      onClick={() => {
                        onMarkAsSold(item);
                        setOpenMenu(null);
                      }}
                      className="w-full px-3 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted"
                    >
                      Mark as Sold
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onDelete([item.id]);
                      setOpenMenu(null);
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs text-red-400 hover:bg-muted"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          );
        },
        enableSorting: false,
        size: 48,
      },
    ],
    [openMenu, onMarkAsSold, onMarkAsListed, onDelete],
  );

  const table = useReactTable({
    data: items,
    columns,
    state: { sorting, globalFilter, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: "includesString",
    enableRowSelection: true,
    getRowId: (row) => String(row.id),
  });

  const selectedIds = Object.keys(rowSelection)
    .filter((k) => rowSelection[k])
    .map(Number);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 bg-card rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search + bulk actions */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search inventory..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-md border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>

        {globalFilter && (
          <button
            onClick={() => {
              setGlobalFilter("");
              setSearchInput("");
            }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground/80"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}

        {selectedIds.length > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {selectedIds.length} selected
            </span>
            <button
              onClick={() => {
                onDelete(selectedIds);
                setRowSelection({});
              }}
              className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-red-400 hover:bg-card transition-colors"
            >
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border bg-card/50">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className={cn(
                      "px-3 py-2 text-left text-xs font-medium text-muted-foreground select-none transition-colors",
                      header.column.getCanSort() &&
                        "cursor-pointer hover:text-muted-foreground",
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                    style={
                      header.column.columnDef.size
                        ? { width: header.column.columnDef.size }
                        : undefined
                    }
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                      {header.column.getIsSorted() && (
                        <ArrowUpDown className="h-3 w-3 text-primary" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-12 text-center text-muted-foreground"
                >
                  No matching items
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => {
                const days = daysHeld(row.original.createdAt);
                const aging = agingClass(days, row.original.status);
                return (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b border-border/50 hover:bg-card/50 transition-colors",
                      aging,
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-2">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-muted-foreground">
        {table.getFilteredRowModel().rows.length} of {items.length} items
      </div>
    </div>
  );
}
