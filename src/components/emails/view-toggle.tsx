'use client';

import { cn } from '@/lib/utils';

interface ViewToggleProps {
  view: 'source' | 'retailer';
  onViewChange: (view: 'source' | 'retailer') => void;
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex rounded-md border border-zinc-800 bg-zinc-900 p-0.5">
      <button
        onClick={() => onViewChange('source')}
        className={cn(
          'px-3 py-1.5 text-xs font-medium rounded transition-colors duration-150',
          view === 'source'
            ? 'bg-amber-500/15 text-amber-400'
            : 'text-zinc-400 hover:text-zinc-200'
        )}
      >
        By Source
      </button>
      <button
        onClick={() => onViewChange('retailer')}
        className={cn(
          'px-3 py-1.5 text-xs font-medium rounded transition-colors duration-150',
          view === 'retailer'
            ? 'bg-amber-500/15 text-amber-400'
            : 'text-zinc-400 hover:text-zinc-200'
        )}
      >
        By Retailer
      </button>
    </div>
  );
}
