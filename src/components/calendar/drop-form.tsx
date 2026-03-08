'use client';

import { useCallback, useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { Drop } from '@/lib/db/types';

const CATEGORIES = [
  'sneakers',
  'pokemon',
  'funko',
  'supreme',
  'electronics',
  'trading cards',
  'other',
] as const;

const categoryColors: Record<string, string> = {
  sneakers: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  pokemon: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
  funko: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
  supreme: 'bg-red-500/15 text-red-400 border-red-500/25',
  electronics: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
  'trading cards': 'bg-orange-500/15 text-orange-400 border-orange-500/25',
  other: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25',
};

const REMINDER_OPTIONS = [
  { value: '', label: 'None' },
  { value: '5', label: '5 minutes before' },
  { value: '15', label: '15 minutes before' },
  { value: '30', label: '30 minutes before' },
  { value: '60', label: '1 hour before' },
  { value: '1440', label: '1 day before' },
] as const;

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export interface DropFormData {
  productName: string;
  brand: string;
  retailer: string;
  category: string;
  dropDate: Date;
  dropTime: string;
  url: string;
  notes: string;
  reminderMinutes: number | null;
}

interface DropFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: DropFormData) => void;
  onDelete?: () => void;
  editDrop?: Drop | null;
}

export function DropForm({ open, onOpenChange, onSubmit, onDelete, editDrop }: DropFormProps) {
  const [productName, setProductName] = useState('');
  const [brand, setBrand] = useState('');
  const [retailer, setRetailer] = useState('');
  const [category, setCategory] = useState('sneakers');
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [reminder, setReminder] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (editDrop) {
      setProductName(editDrop.productName);
      setBrand(editDrop.brand ?? '');
      setRetailer(editDrop.retailer ?? '');
      setCategory(editDrop.category ?? 'sneakers');
      setDate(editDrop.dropDate ? editDrop.dropDate.toISOString().split('T')[0] : todayISO());
      setTime(editDrop.dropTime ?? '');
      setUrl(editDrop.url ?? '');
      setNotes(editDrop.notes ?? '');
      setReminder(editDrop.reminderMinutes != null ? String(editDrop.reminderMinutes) : '');
    } else {
      setProductName('');
      setBrand('');
      setRetailer('');
      setCategory('sneakers');
      setDate(todayISO());
      setTime('');
      setUrl('');
      setNotes('');
      setReminder('');
    }
    setConfirmDelete(false);
  }, [editDrop, open]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!productName.trim() || !date) return;

      onSubmit({
        productName: productName.trim(),
        brand: brand.trim(),
        retailer: retailer.trim(),
        category,
        dropDate: new Date(date + 'T00:00:00'),
        dropTime: time.trim(),
        url: url.trim(),
        notes: notes.trim(),
        reminderMinutes: reminder ? parseInt(reminder, 10) : null,
      });

      onOpenChange(false);
    },
    [productName, brand, retailer, category, date, time, url, notes, reminder, onSubmit, onOpenChange]
  );

  const handleDeleteClick = useCallback(() => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete?.();
    onOpenChange(false);
  }, [confirmDelete, onDelete, onOpenChange]);

  const selectClass =
    'flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-50 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{editDrop ? 'Edit Drop' : 'Add Drop'}</SheetTitle>
          <SheetDescription>
            {editDrop ? 'Update drop details.' : 'Add an upcoming product drop to your calendar.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div className="space-y-2">
            <Label htmlFor="drop-name" className="text-zinc-400 text-xs">Product Name *</Label>
            <Input
              id="drop-name"
              placeholder="Nike Dunk Low Panda"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="bg-zinc-900 border-zinc-800"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="drop-brand" className="text-zinc-400 text-xs">Brand</Label>
              <Input
                id="drop-brand"
                placeholder="Nike"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="bg-zinc-900 border-zinc-800"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="drop-retailer" className="text-zinc-400 text-xs">Retailer</Label>
              <Input
                id="drop-retailer"
                placeholder="Footlocker"
                value={retailer}
                onChange={(e) => setRetailer(e.target.value)}
                className="bg-zinc-900 border-zinc-800"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="drop-category" className="text-zinc-400 text-xs">Category</Label>
            <select
              id="drop-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={selectClass}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={cn(
                  'inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium',
                  categoryColors[category] ?? categoryColors.other
                )}
              >
                {category}
              </span>
              <span className="text-[10px] text-zinc-600">Preview</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="drop-date" className="text-zinc-400 text-xs">Date *</Label>
              <Input
                id="drop-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-zinc-900 border-zinc-800"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="drop-time" className="text-zinc-400 text-xs">Time</Label>
              <Input
                id="drop-time"
                placeholder="10:00 AM EST"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="bg-zinc-900 border-zinc-800"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="drop-url" className="text-zinc-400 text-xs">URL</Label>
            <Input
              id="drop-url"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="bg-zinc-900 border-zinc-800"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="drop-notes" className="text-zinc-400 text-xs">Notes</Label>
            <textarea
              id="drop-notes"
              placeholder="Size run, colorway, tips..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="drop-reminder" className="text-zinc-400 text-xs">Reminder</Label>
            <select
              id="drop-reminder"
              value={reminder}
              onChange={(e) => setReminder(e.target.value)}
              className={selectClass}
            >
              {REMINDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 pt-4">
            {editDrop && onDelete && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDeleteClick}
                className="mr-auto"
              >
                <Trash2 className="size-3.5 mr-1" />
                {confirmDelete ? 'Confirm Delete' : 'Delete'}
              </Button>
            )}
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              {editDrop ? 'Save Changes' : 'Add Drop'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
