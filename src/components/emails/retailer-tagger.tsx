'use client';

import { useCallback, useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const SUGGESTED_RETAILERS = [
  'Nike', 'Footlocker', 'Shopify', 'Supreme', 'Adidas', 'New Balance',
  'Finish Line', 'Eastbay', 'JD Sports', 'SSENSE', 'Target', 'Walmart',
  'Best Buy', 'Amazon', 'Nordstrom', 'Kith', 'Undefeated',
];

interface RetailerTaggerProps {
  currentRetailers: string[];
  onAdd: (retailer: string) => void;
  onRemove: (retailer: string) => void;
}

export function RetailerTagger({ currentRetailers, onAdd, onRemove }: RetailerTaggerProps) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filtered = SUGGESTED_RETAILERS.filter(
    (r) =>
      !currentRetailers.includes(r) &&
      r.toLowerCase().includes(input.toLowerCase())
  );

  const handleAdd = useCallback(
    (retailer: string) => {
      const trimmed = retailer.trim();
      if (trimmed && !currentRetailers.includes(trimmed)) {
        onAdd(trimmed);
      }
      setInput('');
      setShowSuggestions(false);
    },
    [currentRetailers, onAdd]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAdd(input);
      }
    },
    [input, handleAdd]
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {currentRetailers.map((r) => (
          <Badge
            key={r}
            variant="outline"
            className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/25 gap-1"
          >
            {r}
            <button onClick={() => onRemove(r)} className="hover:text-amber-200">
              <X className="size-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="relative">
        <Input
          placeholder="Add retailer tag..."
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onKeyDown={handleKeyDown}
          className="bg-zinc-900 border-zinc-800 text-sm"
        />
        {showSuggestions && input && filtered.length > 0 && (
          <div className="absolute z-10 top-full mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900 py-1 shadow-lg max-h-40 overflow-y-auto">
            {filtered.slice(0, 8).map((r) => (
              <button
                key={r}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleAdd(r)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800"
              >
                <Plus className="size-3 text-zinc-500" />
                {r}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
