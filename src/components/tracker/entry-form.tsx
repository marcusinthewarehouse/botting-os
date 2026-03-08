'use client';

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

const TYPES = ['purchase', 'sale', 'cancel', 'refund'] as const;
const CATEGORIES = ['sneakers', 'pokemon', 'funko', 'electronics', 'shipping', 'fees', 'other'] as const;

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

interface EntryFormData {
  type: string;
  description: string;
  amount: number;
  category: string;
  date: Date;
  tags: string[];
}

interface EntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: EntryFormData) => void;
  initialValues?: Partial<EntryFormData>;
}

export function EntryForm({ open, onOpenChange, onSubmit, initialValues }: EntryFormProps) {
  const [type, setType] = useState(initialValues?.type ?? 'purchase');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [amount, setAmount] = useState(initialValues?.amount ? String(initialValues.amount) : '');
  const [category, setCategory] = useState(initialValues?.category ?? 'sneakers');
  const [date, setDate] = useState(initialValues?.date ? initialValues.date.toISOString().split('T')[0] : todayISO());
  const [tagsInput, setTagsInput] = useState(initialValues?.tags?.join(', ') ?? '');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const parsedAmount = parseFloat(amount);
      if (!description.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      onSubmit({
        type,
        description: description.trim(),
        amount: parsedAmount,
        category,
        date: new Date(date + 'T00:00:00'),
        tags,
      });

      // Reset form
      setDescription('');
      setAmount('');
      setTagsInput('');
      setDate(todayISO());
      onOpenChange(false);
    },
    [type, description, amount, category, date, tagsInput, onSubmit, onOpenChange]
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Add Transaction</SheetTitle>
          <SheetDescription>Record a purchase, sale, cancel, or refund.</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div className="space-y-2">
            <Label htmlFor="entry-type" className="text-zinc-400 text-xs">Type</Label>
            <select
              id="entry-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-50 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="entry-desc" className="text-zinc-400 text-xs">Description</Label>
            <Input
              id="entry-desc"
              placeholder="Nike Dunk Low Panda"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-zinc-900 border-zinc-800"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="entry-amount" className="text-zinc-400 text-xs">Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">$</span>
              <Input
                id="entry-amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-zinc-900 border-zinc-800 pl-7 font-mono tabular-nums"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="entry-category" className="text-zinc-400 text-xs">Category</Label>
            <select
              id="entry-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-50 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="entry-date" className="text-zinc-400 text-xs">Date</Label>
            <Input
              id="entry-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-zinc-900 border-zinc-800"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="entry-tags" className="text-zinc-400 text-xs">Tags (comma-separated)</Label>
            <Input
              id="entry-tags"
              placeholder="nike, resell, sneakers"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="bg-zinc-900 border-zinc-800"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Add Transaction
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
