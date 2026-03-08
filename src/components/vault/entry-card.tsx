'use client';

import { useCallback, useState } from 'react';
import { Eye, EyeOff, Copy, Check, Trash2, Pencil, ChevronDown, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { copyToClipboard } from '@/lib/clipboard';
import { cn } from '@/lib/utils';

interface EntryCardProps {
  entry: {
    id: number;
    site: string;
    username: string;
    password: string;
    notes: string | null;
  };
  onEdit: () => void;
  onDelete: () => void;
}

export function EntryCard({ entry, onEdit, onDelete }: EntryCardProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(false);

  const handleCopy = useCallback(async (value: string, field: string) => {
    await copyToClipboard(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  return (
    <Card className="p-4 bg-black border-white/[0.06] transition-colors duration-150 hover:border-amber-500/30 group">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium text-zinc-50">{entry.site}</h3>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <button
            onClick={onEdit}
            aria-label="Edit entry"
            className="p-1.5 rounded text-zinc-500 hover:text-amber-400 hover:bg-zinc-800 transition-colors duration-150"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            onClick={onDelete}
            aria-label="Delete entry"
            className="p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors duration-150"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Username */}
      <div className="flex items-center justify-between mb-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-zinc-500 mb-0.5">Username</p>
          <p className="text-sm text-zinc-300 truncate font-mono">{entry.username}</p>
        </div>
        <button
          onClick={() => handleCopy(entry.username, 'username')}
          aria-label="Copy username"
          className="p-1.5 rounded text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors duration-150 shrink-0"
        >
          {copiedField === 'username' ? (
            <Check className="size-3.5 text-green-400" />
          ) : (
            <Copy className="size-3.5" />
          )}
        </button>
      </div>

      {/* Password */}
      <div className="flex items-center justify-between mb-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-zinc-500 mb-0.5">Password</p>
          <p className="text-sm text-zinc-300 truncate font-mono">
            {showPassword ? entry.password : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
          </p>
        </div>
        <div className="flex gap-0.5 shrink-0">
          <button
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="p-1.5 rounded text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors duration-150"
          >
            {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          </button>
          <button
            onClick={() => handleCopy(entry.password, 'password')}
            aria-label="Copy password"
            className="p-1.5 rounded text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors duration-150"
          >
            {copiedField === 'password' ? (
              <Check className="size-3.5 text-green-400" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Notes */}
      {entry.notes && (
        <div className="mt-2 pt-2 border-t border-white/[0.06]">
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-400 transition-colors duration-150"
          >
            {showNotes ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
            Notes
          </button>
          {showNotes && (
            <p className="text-xs text-zinc-400 mt-1 whitespace-pre-wrap">{entry.notes}</p>
          )}
        </div>
      )}
    </Card>
  );
}
