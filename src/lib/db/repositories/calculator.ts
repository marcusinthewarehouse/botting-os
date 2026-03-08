import { db } from '../client';
import { calculatorHistory } from '../schema';
import { eq, desc } from 'drizzle-orm';
import type { CalculatorHistory, NewCalculatorHistory } from '../types';

export async function getAll(): Promise<CalculatorHistory[]> {
  return db.select().from(calculatorHistory).orderBy(desc(calculatorHistory.createdAt));
}

export async function create(data: Omit<NewCalculatorHistory, 'id' | 'createdAt'>): Promise<void> {
  const now = new Date();
  await db.insert(calculatorHistory).values({ ...data, createdAt: now });
}

export async function remove(id: number): Promise<void> {
  await db.delete(calculatorHistory).where(eq(calculatorHistory.id, id));
}

export async function clearAll(): Promise<void> {
  await db.delete(calculatorHistory);
}
