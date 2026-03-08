'use client';

import { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  formatCurrency,
  calculateFees,
  getDefaultFeeOptions,
  type Marketplace,
  type FeeBreakdown,
} from '@/lib/fees';
import type { InventoryItem } from '@/lib/db/types';

interface MarkAsSoldDialogProps {
  item: InventoryItem;
  open: boolean;
  onClose: () => void;
  onConfirm: (soldPrice: number, marketplace: string) => void;
}

const MARKETPLACES: { value: Marketplace | 'other'; label: string }[] = [
  { value: 'ebay', label: 'eBay' },
  { value: 'stockx', label: 'StockX' },
  { value: 'goat', label: 'GOAT' },
  { value: 'other', label: 'Other / Local' },
];

export function MarkAsSoldDialog({ item, open, onClose, onConfirm }: MarkAsSoldDialogProps) {
  const [soldPrice, setSoldPrice] = useState('');
  const [marketplace, setMarketplace] = useState<Marketplace | 'other'>('ebay');

  const price = parseFloat(soldPrice);
  const validPrice = !isNaN(price) && price > 0;

  const feeBreakdown: FeeBreakdown | null = useMemo(() => {
    if (!validPrice || marketplace === 'other') return null;
    return calculateFees(price, marketplace, getDefaultFeeOptions());
  }, [price, validPrice, marketplace]);

  const profit = useMemo(() => {
    if (!validPrice) return null;
    if (feeBreakdown) {
      return feeBreakdown.netPayout - item.purchasePrice;
    }
    return price - item.purchasePrice;
  }, [validPrice, price, feeBreakdown, item.purchasePrice]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validPrice) return;
    onConfirm(price, marketplace);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-950 p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-50">Mark as Sold</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 rounded-md bg-zinc-900 px-3 py-2">
          <div className="text-sm text-zinc-50 truncate">{item.name}</div>
          <div className="text-xs text-zinc-500 mt-0.5">
            Purchased for {formatCurrency(item.purchasePrice)}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Marketplace</label>
            <div className="grid grid-cols-4 gap-1.5">
              {MARKETPLACES.map((mp) => (
                <button
                  key={mp.value}
                  type="button"
                  onClick={() => setMarketplace(mp.value)}
                  className={cn(
                    'rounded-md border px-2 py-1.5 text-xs font-medium transition-colors',
                    marketplace === mp.value
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                      : 'border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  )}
                >
                  {mp.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1">Sale Price *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={soldPrice}
                onChange={(e) => setSoldPrice(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-md border border-zinc-800 bg-zinc-900 pl-7 pr-3 py-2 text-sm text-zinc-50 font-mono tabular-nums placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                required
                autoFocus
              />
            </div>
          </div>

          {feeBreakdown && validPrice && (
            <div className="space-y-1.5 rounded-md bg-zinc-900 px-3 py-2">
              <div className="text-xs font-medium text-zinc-400 mb-1">Fee Breakdown</div>
              {feeBreakdown.fees.map((fee, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-zinc-500">{fee.label}</span>
                  <span className="font-mono tabular-nums text-zinc-400">
                    -{formatCurrency(fee.amount)}
                  </span>
                </div>
              ))}
              <div className="border-t border-zinc-800 pt-1.5 flex justify-between text-xs">
                <span className="text-zinc-400">Net Payout</span>
                <span className="font-mono tabular-nums text-zinc-200">
                  {formatCurrency(feeBreakdown.netPayout)}
                </span>
              </div>
            </div>
          )}

          {profit !== null && validPrice && (
            <div className="flex items-center justify-between rounded-md bg-zinc-900 px-3 py-2">
              <span className="text-xs text-zinc-400">Profit</span>
              <span
                className={cn(
                  'text-sm font-semibold font-mono tabular-nums',
                  profit >= 0 ? 'text-green-400' : 'text-red-400'
                )}
              >
                {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
              </span>
            </div>
          )}

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
              disabled={!validPrice}
              className="flex-1 rounded-md bg-amber-500 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm Sale
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
