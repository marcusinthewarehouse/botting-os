'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { CheckoutEvent } from '@/hooks/use-checkout-feed';

export function useAutoInventory() {
  const processedRef = useRef<Set<string>>(new Set());

  function handleNewCheckout(event: CheckoutEvent) {
    if (!event.success) return;
    if (processedRef.current.has(event.id)) return;
    processedRef.current.add(event.id);

    const price = event.price ? event.price / 100 : 0;

    toast('Add to inventory?', {
      description: `${event.product} - $${price.toFixed(2)}`,
      duration: 15000,
      action: {
        label: 'Add',
        onClick: () => addToInventory(event),
      },
    });
  }

  useEffect(() => {
    return () => {
      processedRef.current.clear();
    };
  }, []);

  return { handleNewCheckout };
}

async function addToInventory(event: CheckoutEvent) {
  try {
    const { inventoryRepo } = await import('@/lib/db/repositories');
    await inventoryRepo.create({
      name: event.product,
      category: guessCategoryFromStore(event.store),
      purchasePrice: event.price ? event.price / 100 : 0,
      status: 'in_stock',
    });
    toast.success(`Added "${event.product}" to inventory`);
  } catch {
    toast.error('Failed to add item to inventory');
  }
}

function guessCategoryFromStore(store: string): string {
  const s = store.toLowerCase();
  if (s.includes('nike') || s.includes('footlocker') || s.includes('snkrs') || s.includes('yeezy') || s.includes('adidas')) return 'sneakers';
  if (s.includes('pokemon') || s.includes('tcg')) return 'pokemon';
  if (s.includes('funko')) return 'funko';
  if (s.includes('supreme')) return 'supreme';
  return 'other';
}
