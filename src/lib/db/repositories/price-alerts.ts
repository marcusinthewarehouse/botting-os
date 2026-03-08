import { db } from '../client';
import { priceAlerts } from '../schema';
import { eq, desc, and, lte, gte } from 'drizzle-orm';
import type { PriceAlert, NewPriceAlert } from '../types';

export async function getAll(): Promise<PriceAlert[]> {
  return db.select().from(priceAlerts).orderBy(desc(priceAlerts.createdAt));
}

export async function getById(id: number): Promise<PriceAlert | undefined> {
  const rows = await db.select().from(priceAlerts).where(eq(priceAlerts.id, id));
  return rows[0];
}

export async function create(data: Omit<NewPriceAlert, 'id' | 'createdAt'>): Promise<void> {
  const now = new Date();
  await db.insert(priceAlerts).values({ ...data, createdAt: now });
}

export async function update(id: number, data: Partial<Omit<NewPriceAlert, 'id' | 'createdAt'>>): Promise<void> {
  await db.update(priceAlerts).set(data).where(eq(priceAlerts.id, id));
}

export async function remove(id: number): Promise<void> {
  await db.delete(priceAlerts).where(eq(priceAlerts.id, id));
}

export async function getActive(): Promise<PriceAlert[]> {
  return db.select().from(priceAlerts).where(eq(priceAlerts.active, true)).orderBy(desc(priceAlerts.createdAt));
}

export async function getByMarketplace(marketplace: string): Promise<PriceAlert[]> {
  return db.select().from(priceAlerts).where(eq(priceAlerts.marketplace, marketplace)).orderBy(desc(priceAlerts.createdAt));
}

export async function deactivate(id: number): Promise<void> {
  await db.update(priceAlerts).set({ active: false }).where(eq(priceAlerts.id, id));
}

export async function checkTriggers(productId: string, currentPrice: number): Promise<PriceAlert[]> {
  const belowAlerts = await db
    .select()
    .from(priceAlerts)
    .where(
      and(
        eq(priceAlerts.productId, productId),
        eq(priceAlerts.active, true),
        eq(priceAlerts.direction, 'below'),
        gte(priceAlerts.targetPrice, currentPrice)
      )
    );
  const aboveAlerts = await db
    .select()
    .from(priceAlerts)
    .where(
      and(
        eq(priceAlerts.productId, productId),
        eq(priceAlerts.active, true),
        eq(priceAlerts.direction, 'above'),
        lte(priceAlerts.targetPrice, currentPrice)
      )
    );
  return [...belowAlerts, ...aboveAlerts];
}
