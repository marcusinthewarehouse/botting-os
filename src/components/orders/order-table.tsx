'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
} from '@tanstack/react-table';
import { ArrowUpDown, ChevronDown, ChevronRight, Download, Search, X, Columns3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { CheckoutEvent } from '@/hooks/use-checkout-feed';
import { formatPrice, relativeTime } from '@/hooks/use-checkout-feed';

interface OrderTableProps {
  events: CheckoutEvent[];
  loading: boolean;
}

const BOT_COLORS: Record<string, string> = {
  cybersole: 'text-blue-400',
  valor: 'text-purple-400',
  nsb: 'text-green-400',
  wrath: 'text-red-400',
  kodai: 'text-amber-400',
  balkobot: 'text-cyan-400',
  prism: 'text-pink-400',
  aiobot: 'text-orange-400',
  unknown: 'text-zinc-400',
};

const columns: ColumnDef<CheckoutEvent>[] = [
  {
    accessorKey: 'received_at',
    header: 'Time',
    cell: ({ getValue }) => (
      <span className="text-zinc-400 text-xs">{relativeTime(getValue<string>())}</span>
    ),
    sortingFn: 'datetime',
  },
  {
    accessorKey: 'bot_name',
    header: 'Bot',
    cell: ({ getValue }) => {
      const bot = getValue<string>();
      return (
        <span className={cn('text-xs font-medium capitalize', BOT_COLORS[bot] ?? BOT_COLORS.unknown)}>
          {bot}
        </span>
      );
    },
  },
  {
    accessorKey: 'product',
    header: 'Product',
    cell: ({ getValue }) => (
      <span className="text-zinc-50 text-sm truncate max-w-[240px] block">{getValue<string>()}</span>
    ),
  },
  {
    accessorKey: 'size',
    header: 'Size',
    cell: ({ getValue }) => (
      <span className="font-mono tabular-nums text-zinc-300">{getValue<string | null>() ?? '-'}</span>
    ),
  },
  {
    accessorKey: 'price',
    header: 'Price',
    cell: ({ getValue }) => (
      <span className="font-mono tabular-nums text-zinc-50">{formatPrice(getValue<number | null>())}</span>
    ),
  },
  {
    accessorKey: 'store',
    header: 'Store',
    cell: ({ getValue }) => (
      <span className="text-zinc-300 text-sm">{getValue<string>()}</span>
    ),
  },
  {
    accessorKey: 'success',
    header: 'Status',
    cell: ({ getValue }) => {
      const success = getValue<boolean>();
      return (
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border',
            success
              ? 'bg-green-500/15 text-green-400 border-green-500/25'
              : 'bg-red-500/15 text-red-400 border-red-500/25'
          )}
        >
          {success ? 'Checkout' : 'Declined'}
        </span>
      );
    },
  },
  {
    accessorKey: 'sku',
    header: 'SKU',
    cell: ({ getValue }) => (
      <span className="font-mono text-xs text-zinc-400">{getValue<string | null>() ?? '-'}</span>
    ),
  },
  {
    accessorKey: 'profile',
    header: 'Profile',
    cell: ({ getValue }) => <span className="text-zinc-400 text-xs">{getValue<string | null>() ?? '-'}</span>,
  },
  {
    accessorKey: 'proxy',
    header: 'Proxy',
    cell: ({ getValue }) => <span className="text-zinc-400 text-xs">{getValue<string | null>() ?? '-'}</span>,
  },
  {
    accessorKey: 'order_number',
    header: 'Order #',
    cell: ({ getValue }) => (
      <span className="font-mono text-xs text-zinc-400">{getValue<string | null>() ?? '-'}</span>
    ),
  },
  {
    accessorKey: 'mode',
    header: 'Mode',
    cell: ({ getValue }) => <span className="text-zinc-400 text-xs">{getValue<string | null>() ?? '-'}</span>,
  },
  {
    accessorKey: 'checkout_time',
    header: 'Speed',
    cell: ({ getValue }) => (
      <span className="font-mono text-xs text-zinc-400">{getValue<string | null>() ?? '-'}</span>
    ),
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ getValue }) => <span className="text-zinc-400 text-xs">{getValue<string | null>() ?? '-'}</span>,
  },
];

const DEFAULT_HIDDEN: VisibilityState = {
  sku: false,
  profile: false,
  proxy: false,
  order_number: false,
  mode: false,
  checkout_time: false,
  email: false,
};

export function OrderTable({ events, loading }: OrderTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'received_at', desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(DEFAULT_HIDDEN);
  const [globalFilter, setGlobalFilter] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [searchInput, setSearchInput] = useState('');

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

  const table = useReactTable({
    data: events,
    columns,
    state: { sorting, columnFilters, columnVisibility, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: 'includesString',
  });

  const uniqueBots = useMemo(
    () => [...new Set(events.map((e) => e.bot_name))].sort(),
    [events]
  );
  const uniqueStores = useMemo(
    () => [...new Set(events.map((e) => e.store))].sort(),
    [events]
  );

  const botFilter = (columnFilters.find((f) => f.id === 'bot_name')?.value as string) ?? '';
  const storeFilter = (columnFilters.find((f) => f.id === 'store')?.value as string) ?? '';
  const statusFilter = (columnFilters.find((f) => f.id === 'success')?.value as string) ?? '';

  const hasActiveFilters = globalFilter || botFilter || storeFilter || statusFilter;

  function setFilter(id: string, value: string) {
    setColumnFilters((prev) => {
      const without = prev.filter((f) => f.id !== id);
      if (!value) return without;
      return [...without, { id, value }];
    });
  }

  function clearFilters() {
    setColumnFilters([]);
    setGlobalFilter('');
    setSearchInput('');
  }

  function exportCsv() {
    const visibleColumns = table.getVisibleLeafColumns();
    const header = visibleColumns.map((c) => c.id).join(',');
    const rows = table.getFilteredRowModel().rows.map((row) =>
      visibleColumns
        .map((col) => {
          const val = row.getValue(col.id);
          const str = val === null || val === undefined ? '' : String(val);
          return str.includes(',') ? `"${str}"` : str;
        })
        .join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-10 bg-zinc-900 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search orders..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-md border border-zinc-800 bg-zinc-900 py-2 pl-9 pr-3 text-sm text-zinc-50 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
          />
        </div>

        <select
          value={botFilter}
          onChange={(e) => setFilter('bot_name', e.target.value)}
          className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
        >
          <option value="">All Bots</option>
          {uniqueBots.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>

        <select
          value={storeFilter}
          onChange={(e) => setFilter('store', e.target.value)}
          className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
        >
          <option value="">All Stores</option>
          {uniqueStores.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setFilter('success', e.target.value)}
          className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
        >
          <option value="">All Status</option>
          <option value="true">Checkout</option>
          <option value="false">Declined</option>
        </select>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 rounded-md px-2 py-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowColumnPicker(!showColumnPicker)}
              className="flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <Columns3 className="h-3.5 w-3.5" />
              Columns
            </button>
            {showColumnPicker && (
              <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-md border border-zinc-800 bg-zinc-900 p-2 shadow-lg">
                {table.getAllLeafColumns().map((column) => (
                  <label
                    key={column.id}
                    className="flex items-center gap-2 rounded px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={column.getIsVisible()}
                      onChange={column.getToggleVisibilityHandler()}
                      className="rounded border-zinc-600 accent-amber-500"
                    />
                    {column.id}
                  </label>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={exportCsv}
            className="flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-md border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-zinc-800 bg-zinc-900/50">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-3 py-2 text-left text-xs font-medium text-zinc-500 cursor-pointer select-none hover:text-zinc-300 transition-colors"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() && (
                        <ArrowUpDown className="h-3 w-3 text-amber-500" />
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
                <td colSpan={table.getVisibleLeafColumns().length} className="py-12 text-center text-zinc-500">
                  No matching orders
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <>
                  <tr
                    key={row.id}
                    className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors cursor-pointer"
                    onClick={() => setExpandedRow(expandedRow === row.id ? null : row.id)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-2">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                  {expandedRow === row.id && (
                    <tr key={`${row.id}-detail`} className="bg-zinc-900/30">
                      <td colSpan={table.getVisibleLeafColumns().length} className="px-4 py-3">
                        <ExpandedDetail event={row.original} />
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-zinc-500">
        {table.getFilteredRowModel().rows.length} of {events.length} orders
      </div>
    </div>
  );
}

function ExpandedDetail({ event }: { event: CheckoutEvent }) {
  const details = [
    { label: 'SKU', value: event.sku },
    { label: 'Profile', value: event.profile },
    { label: 'Proxy', value: event.proxy },
    { label: 'Order #', value: event.order_number },
    { label: 'Mode', value: event.mode },
    { label: 'Speed', value: event.checkout_time },
    { label: 'Email', value: event.email },
    { label: 'Quantity', value: event.quantity > 1 ? String(event.quantity) : null },
  ].filter((d) => d.value);

  const extraEntries = Object.entries(event.extras ?? {});

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-4">
        {event.image_url && (
          <img
            src={event.image_url}
            alt={event.product}
            className="w-16 h-16 rounded-md object-cover bg-zinc-800"
          />
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 flex-1">
          {details.map((d) => (
            <div key={d.label}>
              <div className="text-xs text-zinc-500">{d.label}</div>
              <div className="text-sm text-zinc-300 font-mono">{d.value}</div>
            </div>
          ))}
        </div>
      </div>

      {extraEntries.length > 0 && (
        <div>
          <div className="text-xs text-zinc-500 mb-1">Extra fields</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1">
            {extraEntries.map(([k, v]) => (
              <div key={k}>
                <span className="text-xs text-zinc-500">{k}: </span>
                <span className="text-xs text-zinc-400">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-xs text-zinc-600">
        Received: {new Date(event.received_at).toLocaleString()}
      </div>
    </div>
  );
}
