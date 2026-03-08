import { db } from "../client";
import { orders } from "../schema";
import { eq, desc } from "drizzle-orm";
import type { Order, NewOrder } from "../types";

export async function getAll(): Promise<Order[]> {
  return db.select().from(orders).orderBy(desc(orders.createdAt));
}

export async function getById(id: number): Promise<Order | undefined> {
  const rows = await db.select().from(orders).where(eq(orders.id, id));
  return rows[0];
}

export async function create(
  data: Omit<NewOrder, "id" | "createdAt">,
): Promise<void> {
  const now = new Date();
  await db.insert(orders).values({ ...data, createdAt: now });
}

export async function update(
  id: number,
  data: Partial<Omit<NewOrder, "id" | "createdAt">>,
): Promise<void> {
  await db.update(orders).set(data).where(eq(orders.id, id));
}

export async function remove(id: number): Promise<void> {
  await db.delete(orders).where(eq(orders.id, id));
}

export async function getRecent(limit: number): Promise<Order[]> {
  return db.select().from(orders).orderBy(desc(orders.createdAt)).limit(limit);
}

export async function getByBot(botName: string): Promise<Order[]> {
  return db
    .select()
    .from(orders)
    .where(eq(orders.botName, botName))
    .orderBy(desc(orders.createdAt));
}

export async function getByStore(store: string): Promise<Order[]> {
  return db
    .select()
    .from(orders)
    .where(eq(orders.store, store))
    .orderBy(desc(orders.createdAt));
}

export async function getSuccessful(): Promise<Order[]> {
  return db
    .select()
    .from(orders)
    .where(eq(orders.success, true))
    .orderBy(desc(orders.createdAt));
}
