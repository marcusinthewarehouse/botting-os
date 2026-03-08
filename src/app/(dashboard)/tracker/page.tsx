'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { PageHeader } from '@/components/ui/page-header';
import { PageTransition } from '@/components/page-transition';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { CardSkeleton } from '@/components/skeletons/card-skeleton';
import { TableSkeleton } from '@/components/skeletons/table-skeleton';
import { SummaryCards } from '@/components/tracker/summary-cards';
import { EntryForm } from '@/components/tracker/entry-form';
import { CsvImport } from '@/components/tracker/csv-import';
import { trackerRepo } from '@/lib/db/repositories';
import { IS_TAURI } from '@/lib/db/client';
import type { TrackerEntry } from '@/lib/db/types';
import { Trash2, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORIES = ['all', 'sneakers', 'pokemon', 'funko', 'electronics', 'shipping', 'fees', 'other'] as const;
const TYPES = ['all', 'purchase', 'sale', 'cancel', 'refund'] as const;

function fmt(value: number): string {
  return '$' + Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(date: Date | null): string {
  if (!date) return '';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function isIncome(type: string): boolean {
  return type === 'sale' || type === 'refund';
}

export default function TrackerPage() {
  const [entries, setEntries] = useState<TrackerEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [entryFormOpen, setEntryFormOpen] = useState(false);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const loadEntries = useCallback(async () => {
    if (!IS_TAURI) {
      setLoaded(true);
      return;
    }
    try {
      const all = await trackerRepo.getAll();
      setEntries(all);
    } catch {
      // DB not available yet
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const totals = useMemo(() => {
    let totalIncome = 0;
    let totalExpenses = 0;
    for (const entry of entries) {
      if (isIncome(entry.type)) {
        totalIncome += entry.amount;
      } else {
        totalExpenses += entry.amount;
      }
    }
    return {
      totalIncome,
      totalExpenses,
      netPL: totalIncome - totalExpenses,
      transactionCount: entries.length,
    };
  }, [entries]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (typeFilter !== 'all' && e.type !== typeFilter) return false;
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
      if (searchQuery && !e.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [entries, typeFilter, categoryFilter, searchQuery]);

  const handleAddEntry = useCallback(
    async (data: { type: string; description: string; amount: number; category: string; date: Date; tags: string[] }) => {
      try {
        await trackerRepo.create({
          type: data.type,
          description: data.description,
          amount: data.amount,
          category: data.category,
          date: data.date,
          tags: data.tags,
        });
        await loadEntries();
      } catch {
        // DB not available
      }
    },
    [loadEntries]
  );

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await trackerRepo.remove(id);
        await loadEntries();
      } catch {
        // DB not available
      }
    },
    [loadEntries]
  );

  const handleCsvImport = useCallback(
    async (transactions: { description: string; amount: number; date: Date; category: string }[]) => {
      try {
        for (const t of transactions) {
          await trackerRepo.create({
            type: 'purchase',
            description: t.description,
            amount: t.amount,
            category: t.category,
            date: t.date,
            tags: ['csv-import'],
          });
        }
        await loadEntries();
      } catch {
        // DB not available
      }
    },
    [loadEntries]
  );

  const handleExport = useCallback(() => {
    const rows = [
      ['Date', 'Type', 'Description', 'Amount', 'Category', 'Tags'].join(','),
      ...entries.map((e) =>
        [
          e.date ? new Date(e.date).toISOString().split('T')[0] : '',
          e.type,
          `"${e.description.replace(/"/g, '""')}"`,
          e.amount.toFixed(2),
          e.category ?? '',
          (e.tags as string[] | null)?.join(';') ?? '',
        ].join(',')
      ),
    ];
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bottingos-tracker-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [entries]);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setTypeFilter('all');
    setCategoryFilter('all');
  }, []);

  const hasFilters = searchQuery || typeFilter !== 'all' || categoryFilter !== 'all';

  return (
    <PageTransition>
      <PageHeader
        title="Profit & Expense Tracker"
        description="Track purchases, sales, and P&L across all your flips."
        actions={[
          { label: 'Import CSV', onClick: () => setCsvImportOpen(true), variant: 'outline' },
          { label: 'Add Transaction', onClick: () => setEntryFormOpen(true) },
        ]}
      />

      {!loaded ? (
        <div className="space-y-6">
          <CardSkeleton count={4} />
          <TableSkeleton rows={6} columns={6} />
        </div>
      ) : (
      <>
      <SummaryCards
        totalIncome={totals.totalIncome}
        totalExpenses={totals.totalExpenses}
        netPL={totals.netPL}
        transactionCount={totals.transactionCount}
      />

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 mt-6 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
          <Input
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-zinc-900 border-zinc-800 pl-9"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-9 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-300"
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t === 'all' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-9 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-300"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c === 'all' ? 'All Categories' : c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-zinc-500">
            Clear filters
          </Button>
        )}
        {entries.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleExport} className="ml-auto">
            <Download className="size-3.5 mr-1.5" />
            Export
          </Button>
        )}
      </div>

      {/* Transaction table */}
      <Card className="bg-black border-white/[0.06] overflow-hidden">
        {filtered.length === 0 ? (
          entries.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="No transactions yet"
              description="Add your first purchase or sale to start tracking profit."
              action={{ label: 'Add Transaction', onClick: () => setEntryFormOpen(true) }}
            />
          ) : (
            <div className="py-12 text-center">
              <p className="text-sm text-zinc-500">No transactions match your filters.</p>
            </div>
          )
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead className="hidden lg:table-cell">Tags</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((entry) => {
                const income = isIncome(entry.type);
                const tags = (entry.tags as string[] | null) ?? [];
                return (
                  <TableRow key={entry.id}>
                    <TableCell className="text-xs text-zinc-400 whitespace-nowrap">
                      {formatDate(entry.date)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={entry.type === 'purchase' ? 'pending' : entry.type === 'sale' ? 'active' : entry.type === 'cancel' ? 'error' : 'completed'} />
                    </TableCell>
                    <TableCell className="text-sm text-zinc-200 max-w-64 truncate">
                      {entry.description}
                    </TableCell>
                    <TableCell>
                      <span className={cn('font-mono tabular-nums text-sm', income ? 'text-green-400' : 'text-red-400')}>
                        {income ? '+' : '-'}{fmt(entry.amount)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {entry.category && (
                        <Badge variant="outline" className="text-xs bg-zinc-800/50 text-zinc-400 border-zinc-700">
                          {entry.category}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex gap-1">
                        {tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs bg-zinc-800/50 text-zinc-500 border-zinc-700">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="p-1.5 rounded text-zinc-600 hover:text-red-400 hover:bg-zinc-800 transition-colors duration-150"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
      </>
      )}

      <EntryForm open={entryFormOpen} onOpenChange={setEntryFormOpen} onSubmit={handleAddEntry} />
      <CsvImport open={csvImportOpen} onOpenChange={setCsvImportOpen} onImport={handleCsvImport} />
    </PageTransition>
  );
}
