'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface AddItemFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: AddItemData) => void;
}

export interface AddItemData {
  name: string;
  category: string;
  purchasePrice: number;
  sku?: string;
  size?: string;
  location?: string;
  imageUrl?: string;
  notes?: string;
  status?: string;
  listedUrl?: string;
  listedPrice?: number;
}

const CATEGORIES = ['sneakers', 'pokemon', 'funko', 'supreme', 'other'];
const CONDITIONS = ['new', 'used', 'open_box'];

const inputClass = 'w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500/50';
const selectClass = 'w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-amber-500/50';

export function AddItemForm({ open, onClose, onSave }: AddItemFormProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('sneakers');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [condition, setCondition] = useState('new');
  const [sku, setSku] = useState('');
  const [size, setSize] = useState('');
  const [location, setLocation] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [notes, setNotes] = useState('');

  if (!open) return null;

  function resetForm() {
    setName('');
    setCategory('sneakers');
    setPurchasePrice('');
    setCondition('new');
    setSku('');
    setSize('');
    setLocation('');
    setImageUrl('');
    setNotes('');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const price = parseFloat(purchasePrice);
    if (!name.trim() || isNaN(price) || price <= 0) return;

    onSave({
      name: name.trim(),
      category,
      purchasePrice: price,
      sku: sku.trim() || undefined,
      size: size.trim() || undefined,
      location: location.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    resetForm();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950 p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-50">Add Inventory Item</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Product Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nike Dunk Low Panda"
              className={inputClass}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">SKU</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="DD1391-100"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Size</label>
              <input
                type="text"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="10.5"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={selectClass}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c === 'funko' ? 'Funko Pops' : c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-zinc-500 mb-1">Purchase Price *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-md border border-zinc-800 bg-zinc-900 pl-7 pr-3 py-2 text-sm text-zinc-50 font-mono tabular-nums placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className={selectClass}
              >
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c === 'open_box' ? 'Open Box' : c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-zinc-500 mb-1">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Closet, Warehouse, Shipped"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1">Image URL</label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional details..."
              rows={2}
              className={inputClass + ' resize-none'}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-zinc-800 py-2 text-sm text-zinc-400 hover:bg-zinc-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-md bg-amber-500 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-400 transition-colors"
            >
              Add Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
