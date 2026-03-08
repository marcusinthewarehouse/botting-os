import { db } from '../client';
import { emails } from '../schema';
import { eq, desc, like } from 'drizzle-orm';
import type { Email, NewEmail } from '../types';

export async function getAll(): Promise<Email[]> {
  return db.select().from(emails).orderBy(desc(emails.createdAt));
}

export async function getById(id: number): Promise<Email | undefined> {
  const rows = await db.select().from(emails).where(eq(emails.id, id));
  return rows[0];
}

export async function create(data: Omit<NewEmail, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
  const now = new Date();
  await db.insert(emails).values({ ...data, createdAt: now, updatedAt: now });
}

export async function update(id: number, data: Partial<Omit<NewEmail, 'id' | 'createdAt'>>): Promise<void> {
  await db.update(emails).set({ ...data, updatedAt: new Date() }).where(eq(emails.id, id));
}

export async function remove(id: number): Promise<void> {
  await db.delete(emails).where(eq(emails.id, id));
}

export async function getByIcloudAccount(account: string): Promise<Email[]> {
  return db.select().from(emails).where(eq(emails.icloudAccount, account)).orderBy(desc(emails.createdAt));
}

export async function search(query: string): Promise<Email[]> {
  return db.select().from(emails).where(like(emails.address, `%${query}%`)).orderBy(desc(emails.createdAt));
}

export async function bulkCreate(items: Omit<NewEmail, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<void> {
  const now = new Date();
  const withTimestamps = items.map((item) => ({ ...item, createdAt: now, updatedAt: now }));
  const BATCH_SIZE = 50;
  for (let i = 0; i < withTimestamps.length; i += BATCH_SIZE) {
    const batch = withTimestamps.slice(i, i + BATCH_SIZE);
    await db.insert(emails).values(batch);
  }
}

export async function addRetailerTag(id: number, retailer: string): Promise<void> {
  const row = await getById(id);
  if (!row) return;
  const current: string[] = (row.retailers as string[] | null) ?? [];
  if (current.includes(retailer)) return;
  await db.update(emails).set({ retailers: [...current, retailer], updatedAt: new Date() }).where(eq(emails.id, id));
}

export async function removeRetailerTag(id: number, retailer: string): Promise<void> {
  const row = await getById(id);
  if (!row) return;
  const current: string[] = (row.retailers as string[] | null) ?? [];
  await db.update(emails).set({ retailers: current.filter((r) => r !== retailer), updatedAt: new Date() }).where(eq(emails.id, id));
}
