import { db } from '../client';
import { inventoryItems } from '../schema';
import { eq, desc, sum, sql } from 'drizzle-orm';
import type { InventoryItem, NewInventoryItem } from '../types';

export async function getAll(): Promise<InventoryItem[]> {
  return db.select().from(inventoryItems).orderBy(desc(inventoryItems.createdAt));
}

export async function getById(id: number): Promise<InventoryItem | undefined> {
  const rows = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id));
  return rows[0];
}

export async function create(data: Omit<NewInventoryItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
  const now = new Date();
  await db.insert(inventoryItems).values({ ...data, createdAt: now, updatedAt: now });
}

export async function update(id: number, data: Partial<Omit<NewInventoryItem, 'id' | 'createdAt'>>): Promise<void> {
  await db.update(inventoryItems).set({ ...data, updatedAt: new Date() }).where(eq(inventoryItems.id, id));
}

export async function remove(id: number): Promise<void> {
  await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
}

export async function getByCategory(category: string): Promise<InventoryItem[]> {
  return db.select().from(inventoryItems).where(eq(inventoryItems.category, category)).orderBy(desc(inventoryItems.createdAt));
}

export async function getByStatus(status: string): Promise<InventoryItem[]> {
  return db.select().from(inventoryItems).where(eq(inventoryItems.status, status)).orderBy(desc(inventoryItems.createdAt));
}

export async function getInStock(): Promise<InventoryItem[]> {
  return getByStatus('in_stock');
}

export async function markAsSold(id: number, soldPrice: number): Promise<void> {
  await db.update(inventoryItems).set({
    status: 'sold',
    soldPrice,
    soldDate: new Date(),
    updatedAt: new Date(),
  }).where(eq(inventoryItems.id, id));
}

export async function getTotalValue(): Promise<number> {
  const result = await db
    .select({ total: sum(inventoryItems.purchasePrice) })
    .from(inventoryItems)
    .where(eq(inventoryItems.status, 'in_stock'));
  return Number(result[0]?.total ?? 0);
}

export async function getProfit(): Promise<number> {
  const result = await db
    .select({
      profit: sql<number>`sum(${inventoryItems.soldPrice} - ${inventoryItems.purchasePrice})`,
    })
    .from(inventoryItems)
    .where(eq(inventoryItems.status, 'sold'));
  return Number(result[0]?.profit ?? 0);
}
