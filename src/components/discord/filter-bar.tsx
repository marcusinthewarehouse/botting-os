'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface FilterState {
  search: string;
  author: string;
  botOnly: boolean;
}

interface FilterBarProps {
  authors: string[];
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

export function FilterBar({ authors, filters, onChange }: FilterBarProps) {
  const [localSearch, setLocalSearch] = useState(filters.search);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setLocalSearch(filters.search);
  }, [filters.search]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setLocalSearch(value);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onChange({ ...filters, search: value });
      }, 300);
    },
    [filters, onChange]
  );

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  const handleAuthorChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange({ ...filters, author: e.target.value });
    },
    [filters, onChange]
  );

  const toggleBotOnly = useCallback(() => {
    onChange({ ...filters, botOnly: !filters.botOnly });
  }, [filters, onChange]);

  const clearAll = useCallback(() => {
    setLocalSearch('');
    onChange({ search: '', author: '', botOnly: false });
  }, [onChange]);

  const hasFilters = filters.search || filters.author || filters.botOnly;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
        <Input
          placeholder="Search messages..."
          value={localSearch}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9 bg-zinc-900 border-zinc-800 h-8 text-sm"
        />
      </div>

      <select
        value={filters.author}
        onChange={handleAuthorChange}
        className="h-8 rounded-md border border-zinc-800 bg-zinc-900 px-2 text-sm text-zinc-300 outline-none focus:border-amber-500/50"
      >
        <option value="">All authors</option>
        {authors.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>

      <Button
        variant={filters.botOnly ? 'default' : 'outline'}
        size="sm"
        onClick={toggleBotOnly}
        className={cn(
          filters.botOnly && 'bg-amber-500/15 text-amber-400 border-amber-500/25 hover:bg-amber-500/25'
        )}
      >
        <Bot className="size-3.5" data-icon="inline-start" />
        Bot only
      </Button>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearAll}>
          <X className="size-3.5" data-icon="inline-start" />
          Clear
        </Button>
      )}
    </div>
  );
}
