import { db } from '../client';
import { vccs } from '../schema';
import { eq, desc } from 'drizzle-orm';
import type { Vcc, NewVcc } from '../types';

export async function getAll(): Promise<Vcc[]> {
  return db.select().from(vccs).orderBy(desc(vccs.createdAt));
}

export async function getById(id: number): Promise<Vcc | undefined> {
  const rows = await db.select().from(vccs).where(eq(vccs.id, id));
  return rows[0];
}

export async function create(data: Omit<NewVcc, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
  const now = new Date();
  await db.insert(vccs).values({ ...data, createdAt: now, updatedAt: now });
}

export async function update(id: number, data: Partial<Omit<NewVcc, 'id' | 'createdAt'>>): Promise<void> {
  await db.update(vccs).set({ ...data, updatedAt: new Date() }).where(eq(vccs.id, id));
}

export async function remove(id: number): Promise<void> {
  await db.delete(vccs).where(eq(vccs.id, id));
}

export async function getByProvider(provider: string): Promise<Vcc[]> {
  return db.select().from(vccs).where(eq(vccs.provider, provider)).orderBy(desc(vccs.createdAt));
}

export async function getByLinkedAccount(accountId: number): Promise<Vcc[]> {
  return db.select().from(vccs).where(eq(vccs.linkedAccountId, accountId)).orderBy(desc(vccs.createdAt));
}

export async function linkToAccount(vccId: number, accountId: number): Promise<void> {
  await db.update(vccs).set({ linkedAccountId: accountId, updatedAt: new Date() }).where(eq(vccs.id, vccId));
}
