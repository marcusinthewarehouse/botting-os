"use client";

import { useState, useEffect, useCallback } from "react";
import { Boxes, Plus } from "lucide-react";
import { toast, Toaster } from "sonner";
import { PageTransition } from "@/components/page-transition";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { CategoryFilter } from "@/components/inventory/category-filter";
import {
  AddItemForm,
  type AddItemData,
} from "@/components/inventory/add-item-form";
import { MarkAsSoldDialog } from "@/components/inventory/mark-as-sold-dialog";
import type { InventoryItem } from "@/lib/db/types";

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<
    { category: string; count: number; totalValue: number }[]
  >([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [soldItem, setSoldItem] = useState<InventoryItem | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const { inventoryRepo } = await import("@/lib/db/repositories");
      const [allItems, cats] = await Promise.all([
        inventoryRepo.getAll(),
        inventoryRepo.getCategoryCounts(),
      ]);
      setItems(allItems);
      setCategories(cats);
    } catch {
      toast.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const filteredItems = selectedCategory
    ? items.filter((i) => (i.category ?? "other") === selectedCategory)
    : items;

  const handleAddItem = useCallback(
    async (data: AddItemData) => {
      try {
        const { inventoryRepo } = await import("@/lib/db/repositories");
        await inventoryRepo.create({
          name: data.name,
          category: data.category,
          purchasePrice: data.purchasePrice,
          sku: data.sku ?? null,
          size: data.size ?? null,
          location: data.location ?? null,
          imageUrl: data.imageUrl ?? null,
          notes: data.notes ?? null,
          status: "in_stock",
        });
        toast.success(`Added "${data.name}"`);
        fetchAll();
      } catch {
        toast.error("Failed to add item");
      }
    },
    [fetchAll],
  );

  const handleMarkAsListed = useCallback(
    async (item: InventoryItem) => {
      try {
        const { inventoryRepo } = await import("@/lib/db/repositories");
        await inventoryRepo.markAsListed(item.id, "manual");
        toast.success(`"${item.name}" marked as listed`);
        fetchAll();
      } catch {
        toast.error("Failed to update item");
      }
    },
    [fetchAll],
  );

  const handleMarkAsSold = useCallback((item: InventoryItem) => {
    setSoldItem(item);
  }, []);

  const handleConfirmSold = useCallback(
    async (soldPrice: number, marketplace: string) => {
      if (!soldItem) return;
      try {
        const { inventoryRepo } = await import("@/lib/db/repositories");
        await inventoryRepo.markAsSold(soldItem.id, soldPrice, marketplace);
        toast.success(`"${soldItem.name}" marked as sold`);
        setSoldItem(null);
        fetchAll();
      } catch {
        toast.error("Failed to mark as sold");
      }
    },
    [soldItem, fetchAll],
  );

  const handleDelete = useCallback(
    async (ids: number[]) => {
      try {
        const { inventoryRepo } = await import("@/lib/db/repositories");
        await inventoryRepo.bulkRemove(ids);
        toast.success(`Deleted ${ids.length} item${ids.length > 1 ? "s" : ""}`);
        fetchAll();
      } catch {
        toast.error("Failed to delete items");
      }
    },
    [fetchAll],
  );

  if (loading) {
    return (
      <PageTransition>
        <div className="space-y-4">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-16 w-32 bg-muted/60 rounded-lg animate-pulse"
              />
            ))}
          </div>
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 bg-muted/60 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-4">
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--card)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            },
          }}
        />

        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">Inventory</h1>
          <button
            onClick={() => setAddFormOpen(true)}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </button>
        </div>

        {categories.length > 0 && (
          <CategoryFilter
            categories={categories}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />
        )}

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Boxes className="h-12 w-12 text-muted-foreground/60 mb-4" />
            <h3 className="text-sm font-medium text-muted-foreground">
              No inventory items
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Add items manually or they will auto-populate from successful
              checkouts.
            </p>
            <button
              onClick={() => setAddFormOpen(true)}
              className="mt-4 rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Add First Item
            </button>
          </div>
        ) : (
          <InventoryTable
            items={filteredItems}
            loading={false}
            onMarkAsSold={handleMarkAsSold}
            onMarkAsListed={handleMarkAsListed}
            onDelete={handleDelete}
          />
        )}

        <AddItemForm
          open={addFormOpen}
          onClose={() => setAddFormOpen(false)}
          onSave={handleAddItem}
        />

        {soldItem && (
          <MarkAsSoldDialog
            item={soldItem}
            open={true}
            onClose={() => setSoldItem(null)}
            onConfirm={handleConfirmSold}
          />
        )}
      </div>
    </PageTransition>
  );
}
