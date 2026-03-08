import { db } from '../client';
import { settings } from '../schema';
import { eq } from 'drizzle-orm';

export async function get(key: string): Promise<string | undefined> {
  const rows = await db.select().from(settings).where(eq(settings.key, key));
  return rows[0]?.value;
}

export async function set(key: string, value: string): Promise<void> {
  const existing = await get(key);
  if (existing !== undefined) {
    await db.update(settings).set({ value }).where(eq(settings.key, key));
  } else {
    await db.insert(settings).values({ key, value });
  }
}

export async function getAll(): Promise<Record<string, string>> {
  const rows = await db.select().from(settings);
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}

export async function remove(key: string): Promise<void> {
  await db.delete(settings).where(eq(settings.key, key));
}
