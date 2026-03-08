import { db } from '../client';
import { drops } from '../schema';
import { eq, desc, and, gte, lte, isNotNull } from 'drizzle-orm';
import type { Drop, NewDrop } from '../types';

export async function getAll(): Promise<Drop[]> {
  return db.select().from(drops).orderBy(desc(drops.dropDate));
}

export async function getById(id: number): Promise<Drop | undefined> {
  const rows = await db.select().from(drops).where(eq(drops.id, id));
  return rows[0];
}

export async function create(data: Omit<NewDrop, 'id' | 'createdAt'>): Promise<void> {
  const now = new Date();
  await db.insert(drops).values({ ...data, createdAt: now });
}

export async function update(id: number, data: Partial<Omit<NewDrop, 'id' | 'createdAt'>>): Promise<void> {
  await db.update(drops).set(data).where(eq(drops.id, id));
}

export async function remove(id: number): Promise<void> {
  await db.delete(drops).where(eq(drops.id, id));
}

export async function getByDateRange(start: Date, end: Date): Promise<Drop[]> {
  return db
    .select()
    .from(drops)
    .where(and(gte(drops.dropDate, start), lte(drops.dropDate, end)))
    .orderBy(drops.dropDate);
}

export async function getUpcoming(): Promise<Drop[]> {
  const now = new Date();
  return db
    .select()
    .from(drops)
    .where(gte(drops.dropDate, now))
    .orderBy(drops.dropDate);
}

export async function getPendingReminders(): Promise<Drop[]> {
  return db
    .select()
    .from(drops)
    .where(
      and(
        eq(drops.reminded, false),
        isNotNull(drops.reminderMinutes)
      )
    );
}

export async function markReminded(id: number): Promise<void> {
  await db.update(drops).set({ reminded: true }).where(eq(drops.id, id));
}
