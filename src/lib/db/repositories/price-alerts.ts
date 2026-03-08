import { db } from '../client';
import { priceAlerts } from '../schema';
import { eq, desc, and, or } from 'drizzle-orm';
import type { PriceAlert, NewPriceAlert } from '../types';

export async function getAll(): Promise<PriceAlert[]> {
  return db.select().from(priceAlerts).orderBy(desc(priceAlerts.createdAt));
}

export async function getById(id: number): Promise<PriceAlert | undefined> {
  const rows = await db.select().from(priceAlerts).where(eq(priceAlerts.id, id));
  return rows[0];
}

export async function create(data: Omit<NewPriceAlert, 'id' | 'createdAt' | 'triggered' | 'triggeredAt' | 'lastCheckedAt'>): Promise<void> {
  const now = new Date();
  await db.insert(priceAlerts).values({ ...data, createdAt: now, triggered: false });
}

export async function remove(id: number): Promise<void> {
  await db.delete(priceAlerts).where(eq(priceAlerts.id, id));
}

export async function getActive(): Promise<PriceAlert[]> {
  return db
    .select()
    .from(priceAlerts)
    .where(
      or(
        eq(priceAlerts.triggered, false),
        eq(priceAlerts.recurring, true)
      )
    )
    .orderBy(desc(priceAlerts.createdAt));
}

export async function markTriggered(id: number): Promise<void> {
  const now = new Date();
  await db
    .update(priceAlerts)
    .set({ triggered: true, triggeredAt: now, lastCheckedAt: now })
    .where(eq(priceAlerts.id, id));
}

export async function updateCurrentPrice(id: number, price: number): Promise<void> {
  const now = new Date();
  await db
    .update(priceAlerts)
    .set({ currentPrice: price, lastCheckedAt: now })
    .where(eq(priceAlerts.id, id));
}

export async function resetTriggered(id: number): Promise<void> {
  await db
    .update(priceAlerts)
    .set({ triggered: false, triggeredAt: null })
    .where(eq(priceAlerts.id, id));
}
