import { db } from '../client';
import { notifications } from '../schema';
import { eq, desc, sql } from 'drizzle-orm';
import type { Notification } from '../types';

export async function getAll(limit = 20): Promise<Notification[]> {
  return db
    .select()
    .from(notifications)
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function getUnreadCount(): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(eq(notifications.read, false));
  return result[0]?.count ?? 0;
}

export async function create(
  data: Omit<Notification, 'id' | 'read'>
): Promise<void> {
  await db.insert(notifications).values({ ...data, read: false });
}

export async function markAsRead(id: number): Promise<void> {
  await db
    .update(notifications)
    .set({ read: true })
    .where(eq(notifications.id, id));
}

export async function markAllAsRead(): Promise<void> {
  await db
    .update(notifications)
    .set({ read: true })
    .where(eq(notifications.read, false));
}

export async function remove(id: number): Promise<void> {
  await db.delete(notifications).where(eq(notifications.id, id));
}
